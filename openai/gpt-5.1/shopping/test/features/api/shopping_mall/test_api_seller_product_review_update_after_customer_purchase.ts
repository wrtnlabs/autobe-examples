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
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_seller_product_review_update_after_customer_purchase(
  connection: api.IConnection,
) {
  // 1. Register seller and get authorized session
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Register platform admin and create a brand
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3. Switch back to seller session explicitly via login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAuthorized);

  // 4. Seller creates a product
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active", // any non-empty string is allowed
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(8),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5. Seller defines an option type for the product
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 6. Seller defines an option value for that type
  const optionValueCreateBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  // 7. Seller creates a SKU for the product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: `${product.name} - ${optionValue.display_name ?? optionValue.value}`,
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  // 8. Seller creates an inventory item so orders can be placed
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // 9. Register and authenticate a customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // Explicit customer login to ensure actor switching works
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoginAuthorized);

  // 10. Customer creates a cart
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
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
        body: cartCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(cart);

  // 11. Customer adds the SKU as an item in the cart
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "test line item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  // 12. Customer creates an order from that cart
  const itemsSubtotal = 80; // one unit at salePrice
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 13. Customer creates a product review for the product
  const initialRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 4 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;

  const reviewCreateBody = {
    rating: initialRating,
    title: "Good product" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 8 }) as string &
      tags.MinLength<1>,
  } satisfies IShoppingMallProductReview.ICreate;

  const initialReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewCreateBody,
      },
    );
  typia.assert<IShoppingMallProductReview>(initialReview);

  // Capture immutable fields
  const originalReviewId = initialReview.id;
  const originalProductId = initialReview.product.id;
  const originalSkuId = initialReview.sku?.id ?? null;
  const originalCreatedAt = initialReview.createdAt;
  const originalUpdatedAt = initialReview.updatedAt;

  // 15. Switch back to seller via login before update
  const sellerLoginForUpdateBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/reviews",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerAuthorizedForUpdate: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginForUpdateBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedForUpdate);

  // 16. Seller updates the review
  const updatedRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const updatedTitle = "Excellent product" as string &
    tags.MinLength<1> &
    tags.MaxLength<255>;
  const updatedBody = RandomGenerator.paragraph({ sentences: 10 }) as string &
    tags.MinLength<1>;
  const updatedIsPublic = false;

  const reviewUpdateBody = {
    rating: updatedRating,
    title: updatedTitle,
    body: updatedBody,
    is_public: updatedIsPublic,
  } satisfies IShoppingMallProductReview.IUpdate;

  const updatedReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.seller.products.reviews.update(
      connection,
      {
        productId: product.id,
        reviewId: initialReview.id,
        body: reviewUpdateBody,
      },
    );
  typia.assert<IShoppingMallProductReview>(updatedReview);

  // 18. Assertions on updated vs original review
  TestValidator.equals(
    "review id unchanged",
    updatedReview.id,
    originalReviewId,
  );
  TestValidator.equals(
    "review product linkage unchanged",
    updatedReview.product.id,
    originalProductId,
  );
  TestValidator.equals(
    "review sku linkage unchanged",
    updatedReview.sku?.id ?? null,
    originalSkuId,
  );
  TestValidator.equals(
    "review createdAt unchanged",
    updatedReview.createdAt,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "review updatedAt changed after update",
    updatedReview.updatedAt,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "rating updated by seller",
    updatedReview.rating,
    updatedRating,
  );
  TestValidator.equals(
    "title updated by seller",
    updatedReview.title ?? null,
    updatedTitle,
  );
  TestValidator.equals(
    "body updated by seller",
    updatedReview.body ?? null,
    updatedBody,
  );
  TestValidator.equals(
    "visibility updated by seller",
    updatedReview.isPublic,
    updatedIsPublic,
  );
}
