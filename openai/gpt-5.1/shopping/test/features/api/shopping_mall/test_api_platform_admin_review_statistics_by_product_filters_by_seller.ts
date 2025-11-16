import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewStatisticsByProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewStatisticsByProduct";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
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
import type { IShoppingMallProductReviewStatisticsByProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatisticsByProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_platform_admin_review_statistics_by_product_filters_by_seller(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and logs in
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Create two sellers (Seller X and Seller Y)
  const sellerJoinBase = (
    storeName: string,
  ): IShoppingMallSellerJoin.IRequest => ({
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName,
    contactPhone: RandomGenerator.mobile(),
  });

  const sellerXJoin = sellerJoinBase("Seller X Store");
  const sellerX: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerXJoin,
    });
  typia.assert(sellerX);

  const sellerYJoin = sellerJoinBase("Seller Y Store");
  const sellerY: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerYJoin,
    });
  typia.assert(sellerY);

  // 3. As platform admin, create a brand
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // Helper to create full product tree for a seller
  const createProductTreeForSeller = async (
    seller: IShoppingMallSeller.IAuthorized,
    joinRequest: IShoppingMallSellerJoin.IRequest,
  ): Promise<{
    product: IShoppingMallProduct;
    sku: IShoppingMallProductSku;
  }> => {
    // ensure logged in as this seller
    const sellerLoginBody = {
      email: joinRequest.email,
      password: joinRequest.password,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerLogin.IRequest;

    const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.login(connection, {
        body: sellerLoginBody,
      });
    typia.assert(sellerLoggedIn);

    const productCode = RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<1>;

    const productCreateBody = {
      shopping_mall_seller_id: seller.id,
      shopping_mall_brand_id: brand.id,
      code: productCode,
      name: RandomGenerator.paragraph({ sentences: 2 }) as string &
        tags.MinLength<1>,
      short_description: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "active" as string & tags.MinLength<1>,
      is_multi_sku: true,
      primary_image_uri: "https://cdn.example.com/product.png" as string &
        tags.Format<"uri">,
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productCreateBody,
      });
    typia.assert(product);

    const optionTypeCreateBody = {
      name: "Color",
      display_name: "Color",
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
    typia.assert(optionType);

    const optionValueCreateBody = {
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
          body: optionValueCreateBody,
        },
      );
    typia.assert(optionValue);

    const skuCreateBody = {
      code: `${product.code}-SKU1`,
      name: `${product.name} Red`,
      listPrice: 10000,
      salePrice: 8000,
      currency: "KRW",
      isActive: true,
      isPurchasable: true,
    } satisfies IShoppingMallProductSku.ICreate;

    const sku: IShoppingMallProductSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productCode: product.code,
          body: skuCreateBody,
        },
      );
    typia.assert(sku);

    const inventoryCreateBody = {
      product_sku_id: sku.id,
      on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
      backorder_enabled: false,
      preorder_enabled: false,
    } satisfies IShoppingMallInventoryItem.ICreate;

    const inventory: IShoppingMallInventoryItem =
      await api.functional.shoppingMall.seller.inventoryItems.create(
        connection,
        {
          body: inventoryCreateBody,
        },
      );
    typia.assert(inventory);

    return { product, sku };
  };

  const sellerXProduct = await createProductTreeForSeller(sellerX, sellerXJoin);
  const sellerYProduct = await createProductTreeForSeller(sellerY, sellerYJoin);

  // 5. Customer joins, logs in, creates cart, adds items, and creates order
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  const cartCreateBody = {
    currency_code: "KRW",
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

  const cartItemCreate = async (
    sku: IShoppingMallProductSku,
  ): Promise<IShoppingMallCustomerCartItem> => {
    const body = {
      skuId: sku.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      note: null,
    } satisfies IShoppingMallCustomerCartItem.ICreate;

    const item: IShoppingMallCustomerCartItem =
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: cart.id,
          body,
        },
      );
    typia.assert(item);
    return item;
  };

  const cartItemX = await cartItemCreate(sellerXProduct.sku);
  const cartItemY = await cartItemCreate(sellerYProduct.sku);
  void cartItemX;
  void cartItemY;

  const itemsSubtotal = 16000;
  const discountTotal = 0;
  const shippingTotal = 3000;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
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

  // 6. Customer creates reviews for each product
  const createReviewForProduct = async (
    product: IShoppingMallProduct,
    rating: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
  ): Promise<IShoppingMallProductReview> => {
    const body = {
      rating,
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IShoppingMallProductReview.ICreate;

    const review: IShoppingMallProductReview =
      await api.functional.shoppingMall.customer.products.reviews.create(
        connection,
        {
          productId: product.id,
          body,
        },
      );
    typia.assert(review);
    return review;
  };

  const reviewX = await createReviewForProduct(
    sellerXProduct.product,
    5 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
  );
  const reviewY = await createReviewForProduct(
    sellerYProduct.product,
    4 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
  );
  void reviewX;
  void reviewY;

  // 7. Back to platform admin: call statistics endpoint filtered by sellerIds
  const platformAdminLoginAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAgain);

  const statsRequestForSellerX = {
    sellerIds: [sellerX.id],
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    offset: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    productIds: undefined,
    skuIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    orderBy:
      "productId" as IShoppingMallProductReviewStatisticsByProduct.IRequest["orderBy"],
    orderDirection:
      "asc" as IShoppingMallProductReviewStatisticsByProduct.IRequest["orderDirection"],
  } satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest;

  const statsPageForSellerX: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.platformAdmin.reviews.statistics.byProduct.index(
      connection,
      { body: statsRequestForSellerX },
    );
  typia.assert(statsPageForSellerX);

  const sellerXStats = statsPageForSellerX.data;

  await ArrayUtil.asyncForEach(sellerXStats, async (entry) => {
    typia.assert<IShoppingMallProductReviewStatisticsByProduct>(entry);
    TestValidator.equals(
      "statistics entry seller must be Seller X",
      entry.seller?.id ?? null,
      sellerX.id,
    );
    TestValidator.predicate(
      "statistics entry must not be for Seller Y product",
      entry.product.id !== sellerYProduct.product.id,
    );
  });

  TestValidator.predicate(
    "seller X statistics should include at least one entry for Seller X product",
    sellerXStats.some(
      (entry) => entry.product.id === sellerXProduct.product.id,
    ),
  );

  // Optional: reverse check for Seller Y
  const statsRequestForSellerY = {
    sellerIds: [sellerY.id],
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    offset: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    productIds: undefined,
    skuIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    orderBy:
      "productId" as IShoppingMallProductReviewStatisticsByProduct.IRequest["orderBy"],
    orderDirection:
      "asc" as IShoppingMallProductReviewStatisticsByProduct.IRequest["orderDirection"],
  } satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest;

  const statsPageForSellerY: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.platformAdmin.reviews.statistics.byProduct.index(
      connection,
      { body: statsRequestForSellerY },
    );
  typia.assert(statsPageForSellerY);

  const sellerYStats = statsPageForSellerY.data;

  await ArrayUtil.asyncForEach(sellerYStats, async (entry) => {
    typia.assert<IShoppingMallProductReviewStatisticsByProduct>(entry);
    TestValidator.equals(
      "statistics entry seller must be Seller Y",
      entry.seller?.id ?? null,
      sellerY.id,
    );
    TestValidator.predicate(
      "statistics entry must not be for Seller X product",
      entry.product.id !== sellerXProduct.product.id,
    );
  });

  TestValidator.predicate(
    "seller Y statistics should include at least one entry for Seller Y product",
    sellerYStats.some(
      (entry) => entry.product.id === sellerYProduct.product.id,
    ),
  );
}
