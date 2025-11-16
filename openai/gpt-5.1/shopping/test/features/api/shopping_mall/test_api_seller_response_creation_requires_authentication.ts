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
 * Verify that creating a seller response for a product review strictly requires
 * valid seller authentication, and that unauthenticated calls are rejected
 * without creating a response.
 *
 * Business context:
 *
 * - A seller can post a textual response to a customer’s product review via POST
 *   /shoppingMall/seller/reviews/{reviewId}/sellerResponse.
 * - This endpoint is seller-actor scoped; anonymous users or other actors must
 *   not be able to create such responses.
 *
 * Simplified test flow (aligned with the available SDK):
 *
 * 1. Bootstrap three actors via auth APIs:
 *
 *    - PlatformAdmin (for catalog scaffolding where appropriate),
 *    - Seller (who will own the product and later respond to the review),
 *    - Customer (who will purchase and review the product).
 * 2. As platformAdmin, create a category tree and a brand.
 * 3. As seller, create a seller-owned product that will be reviewed, including at
 *    least one option type and option value.
 * 4. As platformAdmin, create a SKU for that product code.
 * 5. As seller, create an inventory item for that SKU so that it becomes
 *    purchasable.
 * 6. As customer, create a cart, add the SKU into the cart, and then create an
 *    order from that cart (using simple but type-correct snapshot amounts).
 * 7. As customer, create a product review for the purchased product and capture
 *    its reviewId.
 * 8. Clone the connection into an unauthenticated connection (empty headers) and
 *    call sellerResponse.create with a valid body; assert that the call fails
 *    via TestValidator.error, demonstrating that auth is mandatory.
 * 9. Finally, with the legitimate seller-authenticated connection, call
 *    sellerResponse.create successfully for the same reviewId, and typia.assert
 *    the returned IShoppingMallProductReviewSellerResponse while verifying that
 *    it references the same review.
 */
export async function test_api_seller_response_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (join also authenticates and sets Authorization)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Seller joins (join authenticates seller)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail: string = sellerJoinBody.email;
  const sellerPassword: string = sellerJoinBody.password;

  // 3. Customer joins (join authenticates customer)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(1),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const productCustomerId: string & tags.Format<"uuid"> = customerAuthorized.id;
  // productCustomerId is not used directly in this flow but kept to show
  // explicitly that we have a concrete customer actor.

  // 4. As platformAdmin, create a category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
    description: "E2E category tree for seller response auth test",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  // 5. As platformAdmin, create a brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: "E2E brand for seller response auth test",
    logo_uri: "https://static.example.com/logo.png" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const brandId: string & tags.Format<"uuid"> = brand.id;

  // 6. Ensure seller is the active actor (login again for clarity)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 7. Seller creates a product that will later be reviewed
  const sellerProductCode: string & tags.MinLength<1> =
    `prod-${RandomGenerator.alphaNumeric(8)}` as string & tags.MinLength<1>;

  const sellerProductBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brandId,
    code: sellerProductCode,
    name: `Test Product ${RandomGenerator.name(1)}`,
    short_description: "Seller product used in seller response auth test",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://static.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(sellerProduct);

  const productId: string & tags.Format<"uuid"> = sellerProduct.id;

  // 8. Seller defines an option type for the product
  const optionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionTypeId: string & tags.Format<"uuid"> = optionType.id;

  // 9. Seller defines an option value for that option type
  const optionValueBody = {
    value: "L",
    display_name: "Large",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionTypeId,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 10. Switch to platformAdmin to create a SKU for the product code
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;

  const skuCreateBody = {
    code: skuCode,
    name: `Variant ${RandomGenerator.name(1)}`,
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
        productCode: sellerProduct.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  const skuId: string & tags.Format<"uuid"> = sku.id;

  // 11. Switch back to seller to create inventory for the SKU
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const inventoryCreateBody = {
    product_sku_id: skuId,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 12. Switch to customer to create cart and order
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 12-1. Create a customer cart
  const cartCreateBody = {
    currency_code: skuCreateBody.currency,
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
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

  const customerCartId: string & tags.Format<"uuid"> = cart.id;

  // 12-2. Add SKU to the cart
  const cartItemCreateBody = {
    skuId,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "E2E test purchase",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 12-3. Create an order from the cart using simple snapshot amounts
  const itemsSubtotal = skuCreateBody.salePrice * cartItemCreateBody.quantity;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBody = {
    customer_cart_id: customerCartId,
    currency_code: skuCreateBody.currency,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 13. Customer creates a product review for the purchased product
  const reviewCreateBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great product!",
    body: "Everything worked as expected in this E2E test.",
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId,
        body: reviewCreateBody,
      },
    );
  typia.assert(review);

  const reviewId: string & tags.Format<"uuid"> = review.id;

  // 14. Prepare a valid seller response body
  const sellerResponseBody = {
    body: "Thank you for your review!",
  } satisfies IShoppingMallProductReviewSellerResponse.ICreate;

  // 15. Build an unauthenticated connection (empty headers) and ensure seller
  //     response creation fails without auth
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "creating seller response without authentication must fail",
    async () => {
      await api.functional.shoppingMall.seller.reviews.sellerResponse.create(
        unauthConnection,
        {
          reviewId,
          body: sellerResponseBody,
        },
      );
    },
  );

  // 16. Ensure we are authenticated as the legitimate seller and successfully
  //     create the seller response
  const finalSellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(finalSellerLogin);

  const sellerResponse: IShoppingMallProductReviewSellerResponse =
    await api.functional.shoppingMall.seller.reviews.sellerResponse.create(
      connection,
      {
        reviewId,
        body: sellerResponseBody,
      },
    );
  typia.assert(sellerResponse);

  TestValidator.equals(
    "seller response should be linked to original review id",
    sellerResponse.review.review_id,
    reviewId,
  );
}
