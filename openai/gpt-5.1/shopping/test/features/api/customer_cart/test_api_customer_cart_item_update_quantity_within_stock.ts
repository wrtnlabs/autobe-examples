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
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that a customer can update quantity of an existing cart item within
 * their own persistent cart when the new quantity is within allowed
 * stock/policy limits.
 *
 * Business flow covered by this test:
 *
 * 1. Register a customer and obtain authenticated customer context.
 * 2. Register a platform admin and create brand + category tree (minimal catalog
 *    prerequisites) – even if not strictly required by cart APIs, this makes
 *    product creation realistic.
 * 3. Register a seller and create a seller-owned product, one option type, one
 *    option value, and one SKU variant.
 * 4. Switch back to the customer and create a persistent customer cart.
 * 5. Add a cart item for the created SKU with initial quantity = 1.
 * 6. Call the target PUT
 *    /shoppingMall/customer/customerCarts/{cartId}/items/{itemId} to update the
 *    quantity (e.g. to 3) and update an item note.
 * 7. Verify that the response reflects the updated quantity and note, and that
 *    monetary line subtotal (when present) is consistent with the SKU price
 *    times the new quantity.
 */
export async function test_api_customer_cart_item_update_quantity_within_stock(
  connection: api.IConnection,
) {
  // Helper to create random but valid URLs for href/referrer fields.
  const randomUrl = (): string =>
    `https://test.example.com/${RandomGenerator.alphaNumeric(8)}`;

  // 1. Customer join (auto-logs in and sets Authorization header)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // Keep customer email/password for later re-login when switching actors.
  const customerEmail: string = customerJoinBody.email;
  const customerPassword: string = customerJoinBody.password;

  // 2. Platform admin join & login to set up catalog prerequisites.
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  const platformAdminEmail: string = platformAdminJoinBody.email;
  const platformAdminPassword: string = platformAdminJoinBody.password;

  // Explicit login to exercise login path and ensure we can re-establish
  // platform admin context later if needed.
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminAuth2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuth2);

  // Create a category tree.
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // Create a brand.
  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: randomUrl(),
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller join & login to create product + option type/value + SKU.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerEmail: string = sellerJoinBody.email;
  const sellerPassword: string = sellerJoinBody.password;

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerAuth2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuth2);

  // Create a seller-owned product which will own the SKU used in the cart.
  const sellerProductCode: string = `prod-${RandomGenerator.alphaNumeric(10)}`;
  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerAuth2.id,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode,
    name: RandomGenerator.name(2),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: randomUrl(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // Create a product option type for the seller product.
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // Create a product option value under the option type.
  const optionValueCreateBody = {
    value: "M",
    display_name: "Medium",
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // Create a SKU under the seller product.
  const skuCode: string = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
    name: `${sellerProduct.name}-M`,
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4. Switch back to customer context for cart operations (login).
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuth2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuth2);

  // 5. Customer creates a persistent cart.
  const cartCreateBody = {
    currency_code: sku.currency,
    region_code: "US", // simple static region code
    channel: "web",
    metadata: {
      scenario: "update_quantity_within_stock",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // 6. Customer adds an item to the cart with initial quantity 1.
  const initialItemCreateBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Initial item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const initialItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: initialItemCreateBody,
      },
    );
  typia.assert(initialItem);

  // 7. Update the cart item quantity to a higher value within stock thresholds.
  const updatedQuantity = 3;
  const updatedNote: string = "Updated quantity to 3";

  const updateBody = {
    quantity: updatedQuantity,
    note: updatedNote,
  } satisfies IShoppingMallCustomerCartItem.IUpdate;

  const updatedItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.update(
      connection,
      {
        customerCartId: cart.id,
        customerCartItemId: initialItem.id,
        body: updateBody,
      },
    );
  typia.assert(updatedItem);

  // 8. Assertions: quantity and note updated, and subtotal consistent when present.
  TestValidator.equals(
    "cart item quantity should be updated to requested value",
    updatedItem.quantity,
    updatedQuantity,
  );

  TestValidator.equals(
    "cart item note should be updated to new text",
    updatedItem.note,
    updatedNote,
  );

  // If lineSubtotal and unitPrice are present, verify subtotal = unitPrice * quantity.
  if (
    updatedItem.unitPrice !== undefined &&
    updatedItem.unitPrice !== null &&
    updatedItem.lineSubtotal !== undefined &&
    updatedItem.lineSubtotal !== null
  ) {
    const expectedSubtotal: number =
      updatedItem.unitPrice * updatedItem.quantity;
    TestValidator.equals(
      "lineSubtotal should equal unitPrice * quantity when both present",
      updatedItem.lineSubtotal,
      expectedSubtotal,
    );
  }
}
