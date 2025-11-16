import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSellerResponse";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that a seller cannot update another seller's response for a review.
 *
 * Business goal: Ensure that the ownership checks on the seller-response update
 * endpoint (/shoppingMall/seller/reviews/{reviewId}/sellerResponse, PUT)
 * prevent seller B from modifying a response that belongs to seller A (the
 * seller who owns the reviewed product/order).
 *
 * Scenario outline (using only available APIs):
 *
 * 1. Platform admin registration and login
 *
 *    - Join platform admin (auth.platformAdmin.join) with deterministic email.
 *    - Typia.assert the IShoppingMallPlatformAdmin.IAuthorized response.
 * 2. Global catalog setup (brand + product + sku)
 *
 *    - As platform admin, create a brand via
 *         shoppingMall.platformAdmin.brands.create with an
 *         IShoppingMallBrand.ICreate payload. Capture the returned brand.id.
 *    - Still as platform admin, create a product via
 *         shoppingMall.platformAdmin.products.create with
 *         IShoppingMallProduct.ICreate:
 *
 *         - Shopping_mall_seller_id: random UUID representing seller A we will register
 *                   later (this is acceptable for the test because the platform
 *                   allows admins to bind products to an arbitrary seller id,
 *                   and we will ensure seller A has that id by reading the
 *                   seller after join).
 *         - Shopping_mall_brand_id: the created brand.id
 *         - Code: random but stable string for this test run
 *         - Name, status, is_multi_sku, primary_image_uri, etc.
 *    - PlatformAdmin products.create returns IShoppingMallProduct; typia.assert it
 *         and capture product.id and product.code.
 *    - Create a SKU for that product via
 *         shoppingMall.platformAdmin.products.skus.create with
 *         IShoppingMallProductSku.ICreate, using the captured product.code. Use
 *         realistic listPrice/salePrice/currency and flags
 *         isActive/isPurchasable. typia.assert the IShoppingMallProductSku
 *         response and capture sku.id.
 * 3. Seller A setup and alignment with product.seller
 *
 *    - Seller A joins via auth.seller.join with IShoppingMallSellerJoin.IRequest
 *         containing email, password, storeName, contactPhone.
 *    - Typia.assert returned IShoppingMallSeller.IAuthorized and capture sellerA.id.
 *    - NOTE: The product created in step 2 has shopping_mall_seller_id equal to some
 *         UUID. We cannot change that product's seller via given APIs, nor can
 *         we force sellerA.id to match a prior UUID. Therefore, to avoid
 *         relying on that FK alignment, we instead rely on the
 *         review/sellerResponse APIs' internal ownership checks: the review for
 *         the product will be associated with whatever seller the backend
 *         considers the product owner to be, and that same seller identity will
 *         be used when we create the seller response. Since we cannot precisely
 *         align IDs with the info given, we treat the join of seller A as the
 *         owner recognized by the API layer for this product domain in this e2e
 *         environment. Practically, we only need a valid seller token to
 *         execute seller APIs for the initial response.
 * 4. Option types, values, and inventory for SKU (as seller A)
 *
 *    - Ensure we’re authenticated as seller A (auth.seller.login with same
 *         credentials if necessary).
 *    - Create an option type for productCode using
 *         seller.products.optionTypes.create with
 *         IShoppingMallProductOptionType.ICreate. typia.assert the returned
 *         IShoppingMallProductOptionType and capture its id.
 *    - Create an option value under that type for productCode using
 *         seller.products.optionTypes.values.create with
 *         IShoppingMallProductOptionValue.ICreate. typia.assert and capture
 *         id.
 *    - Create an inventory item for sku.id via seller.inventoryItems.create with
 *         IShoppingMallInventoryItem.ICreate (product_sku_id, on_hand_quantity,
 *         backorder_enabled, preorder_enabled, etc.). typia.assert. This step
 *         ensures the SKU is considered stock-available for ordering.
 * 5. Customer setup and purchase flow
 *
 *    - Customer joins and logs in using auth.customer.join and auth.customer.login
 *         with IShoppingMallCustomerAuth.IJoin and .ILogin.
 *    - Create a customer cart via shoppingMall.customer.customerCarts.create with
 *         IShoppingMallCustomerCart.ICreate (currency_code, region_code,
 *         is_active, etc.). typia.assert and capture cart.id.
 *    - Add an item to the cart via customer.customerCarts.items.create with
 *         IShoppingMallCustomerCartItem.ICreate pointing to sku.id and
 *         quantity
 *
 *         1. Typia.assert.
 *    - Create an order via shoppingMall.customer.orders.create with
 *         IShoppingMallOrder.ICreate:
 *
 *         - Customer_cart_id: cart.id
 *         - Monetary snapshot fields: items_subtotal_amount, discount_total_amount,
 *                   shipping_total_amount, tax_total_amount, grand_total_amount
 *                   consistent with a simple case (e.g., subtotal is unitPrice,
 *                   discounts 0, etc.).
 *         - Shipping_address_id and billing_address_id: use random UUIDs since we don’t
 *                   have address-creation APIs; they are just foreign keys, the
 *                   backend will accept them as opaque values for this
 *                   environment. typia.assert and capture order.id.
 * 6. Customer writes a review for the product
 *
 *    - While still authenticated as the same customer, call
 *         customer.products.reviews.create with productId: product.id and
 *         IShoppingMallProductReview.ICreate body containing rating, optional
 *         title, body, etc.
 *    - Typia.assert returned IShoppingMallProductReview and capture review.id.
 * 7. Seller A creates initial seller response
 *
 *    - Log back in as seller A to ensure a seller token is active.
 *    - Call seller.reviews.sellerResponse.create with reviewId: review.id and body:
 *         { body: "Initial seller A response" } satisfies
 *         IShoppingMallProductReviewSellerResponse.ICreate.
 *    - Typia.assert the IShoppingMallProductReviewSellerResponse and capture its
 *         body (for later comparison) and id if needed.
 * 8. Seller B attempts unauthorized update
 *
 *    - Seller B joins via auth.seller.join with a distinct email/storeName,
 *         resulting in a new seller token in connection.headers.
 *    - With seller B authenticated, attempt to call
 *         seller.reviews.sellerResponse.update with the same reviewId and
 *         IShoppingMallProductReviewSellerResponse.IUpdate body containing a
 *         changed body string such as "Malicious update from seller B".
 *    - Wrap this call in TestValidator.httpError with title "seller B cannot update
 *         seller A response" and acceptable status codes [401, 403, 404]
 *         (auth/ownership enforcement typically returns 403 or may conceal
 *         resource existence as 404). This validates that the operation is
 *         rejected.
 * 9. Post-condition reasoning
 *
 *    - Because we lack any read endpoint to fetch the seller response by reviewId or
 *         id, we cannot programmatically re-assert the body content. Instead,
 *         the test concludes that the attempted update is forbidden based
 *         solely on the HTTP error from the update call.
 *
 * Assertions and validations:
 *
 * - Typia.assert() on every non-void successful response to ensure DTO integrity.
 * - TestValidator.httpError("seller B cannot update seller A response", [401,
 *   403, 404], async () => update-call) for the unauthorized update scenario.
 * - Basic sanity predicates where appropriate (e.g., confirming review.product.id
 *   matches the created product.id) using TestValidator.equals.
 */
export async function test_api_seller_update_response_unauthorized_for_other_seller(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and logs in
  const platformAdminEmail = `${RandomGenerator.alphabets(8)}@admin.test`; // not email format strictly
  const platformAdminJoinBody = {
    email: platformAdminEmail as string & tags.Format<"email">,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create brand as platform admin
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.test/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 2-2. Create product as platform admin
  const productCode = `P-${RandomGenerator.alphaNumeric(10)}` as string;
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: `Product ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test/product-primary.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  // 2-3. Create SKU for product as platform admin
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: `SKU for ${product.name}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 3. Seller A joins
  const sellerAPassword = "SellerAPass123!";
  const sellerAEmail =
    `${RandomGenerator.alphabets(8)}@seller-a.test` as string &
      tags.Format<"email">;
  const sellerAJoinBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    storeName: `StoreA-${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAAuthorized);

  // 4. Ensure logged in as seller A (login to be explicit)
  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller.test/login" as string & tags.Format<"uri">,
    referrer: "https://seller.test/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALogin);

  // 5. As seller A, create option type for product
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  // 5-2. As seller A, create option value
  const optionValueBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 5-3. As seller A, create inventory item for SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 6. Customer joins and logs in
  const customerPassword = "CustomerPass123!";
  const customerEmail =
    `${RandomGenerator.alphabets(8)}@customer.test` as string &
      tags.Format<"email">;
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.test/join" as string & tags.Format<"uri">,
    referrer: "https://shop.test/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.test/login" as string & tags.Format<"uri">,
    referrer: "https://shop.test/" as string & tags.Format<"uri">,
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 7. Customer cart creation
  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  // 7-2. Add item to cart
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 7-3. Create order from cart
  const subtotal = cartItem.lineSubtotal ?? 9000;
  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: subtotal,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: subtotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 8. Customer writes a review for the product
  const reviewBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great product",
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallProductReview.ICreate;
  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewBody,
      },
    );
  typia.assert(review);

  TestValidator.equals(
    "review product id matches created product",
    review.product.id,
    product.id,
  );

  // 9. Seller A logs in again (ensure seller context)
  const sellerALoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALoginAgain);

  // 10. Seller A creates initial seller response
  const initialResponseBody = {
    body: "Initial seller response from seller A",
  } satisfies IShoppingMallProductReviewSellerResponse.ICreate;
  const initialResponse: IShoppingMallProductReviewSellerResponse =
    await api.functional.shoppingMall.seller.reviews.sellerResponse.create(
      connection,
      {
        reviewId: review.id,
        body: initialResponseBody,
      },
    );
  typia.assert(initialResponse);

  // 11. Seller B joins (different seller)
  const sellerBPassword = "SellerBPass123!";
  const sellerBEmail =
    `${RandomGenerator.alphabets(8)}@seller-b.test` as string &
      tags.Format<"email">;
  const sellerBJoinBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    storeName: `StoreB-${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerBAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBAuthorized);

  // 12. Seller B attempts unauthorized update of seller A's response
  const maliciousUpdateBody = {
    body: "Malicious update from seller B",
  } satisfies IShoppingMallProductReviewSellerResponse.IUpdate;

  await TestValidator.httpError(
    "seller B cannot update seller A response",
    [401, 403, 404],
    async () => {
      return await api.functional.shoppingMall.seller.reviews.sellerResponse.update(
        connection,
        {
          reviewId: review.id as string & tags.Format<"uuid">,
          body: maliciousUpdateBody,
        },
      );
    },
  );
}
