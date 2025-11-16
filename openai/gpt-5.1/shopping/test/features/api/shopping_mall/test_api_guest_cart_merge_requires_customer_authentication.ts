import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallGuestCartMerge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartMerge";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Verify that merging a guest cart into a customer cart requires customer
 * authentication.
 *
 * Business purpose:
 *
 * - Ensure that `/shoppingMall/customer/guestCarts/mergeIntoCustomer` cannot be
 *   used by anonymous callers to mutate carts or associate guest carts with any
 *   customer.
 * - Confirm that, when a customer is properly authenticated, the same merge
 *   operation succeeds and returns a persistent customer cart.
 *
 * High-level flow:
 *
 * 1. Bootstrap actors and catalog:
 *
 *    - Join a platform admin via POST /auth/platformAdmin/join.
 *    - Join a seller via POST /auth/seller/join.
 *    - (Optionally) log them in if needed, but the SDK already sets Authorization on
 *         join responses.
 *    - As platform admin, create a brand via POST /shoppingMall/platformAdmin/brands
 *         using IShoppingMallBrand.ICreate.
 *    - As seller, create a product via POST /shoppingMall/seller/products using
 *         IShoppingMallProduct.ICreate, referencing the seller id and brand
 *         id.
 *    - As seller, create a SKU under that product via POST
 *         /shoppingMall/seller/products/{productCode}/skus using
 *         IShoppingMallProductSku.ICreate.
 * 2. Build a guest cart with an item:
 *
 *    - Create a guest cart via POST /shoppingMall/guestCarts using
 *         IShoppingMallGuestCart.ICreate with a random guest_token and basic
 *         context (ip, user_agent, referrer).
 *    - Add a guest cart item via POST /shoppingMall/guestCarts/{guestCartId}/items
 *         using IShoppingMallGuestCartItem.ICreate, referencing the created SKU
 *         id and a small positive quantity.
 *    - Assert returned IShoppingMallGuestCart and IShoppingMallGuestCartItem using
 *         typia.assert.
 * 3. Negative test: anonymous merge must fail:
 *
 *    - Clone the incoming `connection` into an unauthenticated connection object by
 *         spreading and overriding headers to an empty object, e.g. `{
 *         ...connection, headers: {} }`.
 *    - Call api.functional.shoppingMall.customer.guestCarts.mergeIntoCustomer.create
 *         on that unauthenticated connection with a body built as
 *         IShoppingMallGuestCartMerge.ICreate containing the `guest_cart_id`
 *         from step 2 and an optional `merge_strategy` (e.g.
 *         "sum-quantities").
 *    - Use `await TestValidator.httpError` or `await TestValidator.error` to assert
 *         that the call fails with an HTTP authorization error (e.g. 401/403).
 *         Do not assert exact status code; just ensure an error is thrown.
 *    - Also optionally assert that the guest cart still exists or that there is no
 *         sign of a created customer cart, if such APIs existed (they do not in
 *         this SDK, so skip that part).
 * 4. Positive control: authenticated merge succeeds:
 *
 *    - Using the original `connection` (which still holds seller/platformAdmin auth
 *         in headers), register a customer via POST /auth/customer/join using
 *         IShoppingMallCustomerAuth.IJoin with random email, password, name,
 *         href, referrer and optional ip.
 *    - The customer join response returns IShoppingMallCustomer.IAuthorized and the
 *         SDK sets Authorization header on the same `connection` to the
 *         customer token.
 *    - Immediately call the merge API again, now using the authenticated customer
 *         connection, with the same guest_cart_id in the
 *         IShoppingMallGuestCartMerge.ICreate body.
 *    - Assert that the response is a valid IShoppingMallCustomerCart using
 *         typia.assert and business checks:
 *
 *         - `is_active` is true.
 *         - `customer.id` matches the authenticated customer id.
 *         - `source_guest_token` equals the original guest_token, if present.
 * 5. Additional assertions and invariants:
 *
 *    - Ensure that all successful API calls are awaited.
 *    - Use RandomGenerator and typia.random with proper tag types for realistic test
 *         data (emails, URIs, etc.).
 *    - Never touch `connection.headers` directly inside the test function.
 *    - Use TestValidator.equals / predicate with descriptive titles for core
 *         business expectations.
 */
export async function test_api_guest_cart_merge_requires_customer_authentication(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin and seller, then create brand, product, and SKU
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuthorized);

  const brandCreateInput = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateInput,
    });
  typia.assert(brand);

  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    10,
  ) as string & tags.MinLength<1>;
  const productCreateInput = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateInput,
    });
  typia.assert(product);

  const skuCreateInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateInput,
    });
  typia.assert(sku);

  // 2. Create guest cart and add an item
  const guestToken: string = RandomGenerator.alphaNumeric(24);
  const guestCartCreateInput = {
    guest_token: guestToken,
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (E2E Test)",
    referrer: "https://shop.example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;
  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateInput,
    });
  typia.assert(guestCart);

  const guestItemCreateInput = {
    sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallGuestCartItem.ICreate;
  const guestItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: guestItemCreateInput,
    });
  typia.assert(guestItem);
  TestValidator.equals(
    "guest cart id on item matches parent cart",
    guestItem.guest_cart_id,
    guestCart.id,
  );

  // 3. Anonymous merge attempt must fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const mergeBody: IShoppingMallGuestCartMerge.ICreate = {
    guest_cart_id: guestCart.id,
    merge_strategy: "sum-quantities",
  } satisfies IShoppingMallGuestCartMerge.ICreate;

  await TestValidator.httpError(
    "anonymous guest cart merge must be unauthorized",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.guestCarts.mergeIntoCustomer.create(
        unauthenticatedConnection,
        { body: mergeBody },
      );
    },
  );

  // 4. Authenticated customer merge succeeds
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/account/join",
    referrer: "https://shop.example.com/cart",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const mergedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.guestCarts.mergeIntoCustomer.create(
      connection,
      { body: mergeBody },
    );
  typia.assert(mergedCart);

  // 5. Business assertions on merged customer cart
  TestValidator.equals(
    "merged cart belongs to authenticated customer",
    mergedCart.customer.id,
    customerAuthorized.id,
  );
  TestValidator.predicate(
    "merged customer cart is active",
    mergedCart.is_active === true,
  );
  TestValidator.equals(
    "merged cart source_guest_token matches guest cart token",
    mergedCart.source_guest_token ?? null,
    guestToken,
  );
}
