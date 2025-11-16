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
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewReport";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_review_multiple_reports_aggregation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin, then log in again to simulate normal flow
  const platformAdminJoinBody = {
    email: RandomGenerator.alphabets(8) + "@admin.example.com",
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Create catalog prerequisites: category tree, brand, product, sku
  const categoryTreeBody = {
    code: "tree-" + RandomGenerator.alphabets(8),
    name: "Main Catalog " + RandomGenerator.alphabets(4),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: "Brand " + RandomGenerator.alphabets(6),
    slug: "brand-" + RandomGenerator.alphabets(6),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphabets(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: "prd-" + RandomGenerator.alphabets(8),
    name: "Product " + RandomGenerator.alphabets(6),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphabets(10),
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

  const skuBody = {
    code: "sku-" + RandomGenerator.alphabets(8),
    name: "SKU " + RandomGenerator.alphabets(6),
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
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

  // Helper to register a customer (join) and return its authorized envelope
  const registerCustomer = async () => {
    const joinBody = {
      email: RandomGenerator.alphabets(8) + "@customer.example.com",
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://shop.example.com/join",
      referrer: "https://shop.example.com/",
    } satisfies IShoppingMallCustomerAuth.IJoin;

    const authorized: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: joinBody,
      });
    typia.assert(authorized);

    return { joinBody, authorized };
  };

  // Helper to log in a customer
  const loginCustomer = async (body: IShoppingMallCustomerAuth.ILogin) => {
    const authorized: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body,
      });
    typia.assert(authorized);
    return authorized;
  };

  // Helper to create cart, add sku, and create order for an authenticated customer
  const createCartAndOrder = async () => {
    const cartBody = {
      currency_code: "USD",
      region_code: "US",
      channel: "web",
      metadata: undefined,
      is_active: true,
      source_guest_token: undefined,
    } satisfies IShoppingMallCustomerCart.ICreate;

    const cart: IShoppingMallCustomerCart =
      await api.functional.shoppingMall.customer.customerCarts.create(
        connection,
        { body: cartBody },
      );
    typia.assert(cart);

    const cartItemBody = {
      skuId: sku.id,
      quantity: 1,
      note: null,
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

    const itemsSubtotal = 100;
    const discountTotal = 20;
    const shippingTotal = 5;
    const taxTotal = 8;
    const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

    const orderBody = {
      customer_cart_id: cart.id,
      currency_code: cart.currency_code,
      items_subtotal_amount: itemsSubtotal,
      discount_total_amount: discountTotal,
      shipping_total_amount: shippingTotal,
      tax_total_amount: taxTotal,
      grand_total_amount: grandTotal,
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      billing_address_id: typia.random<string & tags.Format<"uuid">>(),
      customer_note: undefined,
    } satisfies IShoppingMallOrder.ICreate;

    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderBody,
      });
    typia.assert(order);

    return { cart, cartItem, order };
  };

  // 3. Register three customers: A, B, C
  const customerA = await registerCustomer();
  const customerB = await registerCustomer();
  const customerC = await registerCustomer();

  // 4. For each customer, create a cart, add SKU, and create an order
  // Customer A (already authenticated from join)
  const aContext = await createCartAndOrder();
  void aContext;

  // Customer B
  const customerBLoginBody = {
    email: customerB.joinBody.email,
    password: customerB.joinBody.password,
    ip: "127.0.0.1",
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "Mozilla/5.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  await loginCustomer(customerBLoginBody);
  const bContext = await createCartAndOrder();
  void bContext;

  // Customer C
  const customerCLoginBody = {
    email: customerC.joinBody.email,
    password: customerC.joinBody.password,
    ip: "127.0.0.1",
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "Mozilla/5.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  await loginCustomer(customerCLoginBody);
  const cContext = await createCartAndOrder();
  void cContext;

  // 5. As Customer A, create a product review for the product
  const customerALoginBody = {
    email: customerA.joinBody.email,
    password: customerA.joinBody.password,
    ip: "127.0.0.1",
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "Mozilla/5.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerAAuthorized = await loginCustomer(customerALoginBody);

  const reviewBody = {
    rating: 4,
    title: "Solid product",
    body: RandomGenerator.paragraph({ sentences: 8 }),
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

  // 6. As Customer B, submit first report
  const customerBAuthorized = await loginCustomer(customerBLoginBody);

  const reportBBody = {
    reason_code: "spam",
    description: "This review looks like spam or irrelevant advertising.",
    metadata: {},
  } satisfies IShoppingMallProductReviewReport.ICreate;

  const reportB: IShoppingMallProductReviewReport =
    await api.functional.shoppingMall.customer.reviews.reports.create(
      connection,
      {
        reviewId: review.id,
        body: reportBBody,
      },
    );
  typia.assert(reportB);

  // 7. As Customer C, submit second report
  const customerCAuthorized = await loginCustomer(customerCLoginBody);

  const reportCBody = {
    reason_code: "abusive",
    description: "Contains abusive or offensive language.",
    metadata: {},
  } satisfies IShoppingMallProductReviewReport.ICreate;

  const reportC: IShoppingMallProductReviewReport =
    await api.functional.shoppingMall.customer.reviews.reports.create(
      connection,
      {
        reviewId: review.id,
        body: reportCBody,
      },
    );
  typia.assert(reportC);

  // 8. Assertions: multiple distinct reports with same reviewId and correct reporters/payloads
  TestValidator.notEquals(
    "each report should have a distinct id",
    reportB.id,
    reportC.id,
  );

  TestValidator.equals(
    "reportB.reviewId equals review.id",
    reportB.reviewId,
    review.id,
  );
  TestValidator.equals(
    "reportC.reviewId equals review.id",
    reportC.reviewId,
    review.id,
  );
  TestValidator.equals(
    "both reports share same reviewId",
    reportB.reviewId,
    reportC.reviewId,
  );

  TestValidator.equals(
    "reportB reporterType is customer",
    reportB.reporterType,
    "customer",
  );
  TestValidator.equals(
    "reportC reporterType is customer",
    reportC.reporterType,
    "customer",
  );

  TestValidator.equals(
    "reportB reporterId equals Customer B id",
    reportB.reporterId,
    customerBAuthorized.customer.id,
  );
  TestValidator.equals(
    "reportC reporterId equals Customer C id",
    reportC.reporterId,
    customerCAuthorized.customer.id,
  );

  TestValidator.equals(
    "reportB reasonCode matches payload",
    reportB.reasonCode,
    reportBBody.reason_code,
  );
  TestValidator.equals(
    "reportC reasonCode matches payload",
    reportC.reasonCode,
    reportCBody.reason_code,
  );

  TestValidator.equals(
    "reportB description matches payload",
    reportB.description ?? null,
    reportBBody.description ?? null,
  );
  TestValidator.equals(
    "reportC description matches payload",
    reportC.description ?? null,
    reportCBody.description ?? null,
  );

  // Ensure original reviewer (customer A) is distinct from reporters B and C
  TestValidator.notEquals(
    "Customer A id differs from Customer B id",
    customerAAuthorized.customer.id,
    customerBAuthorized.customer.id,
  );
  TestValidator.notEquals(
    "Customer A id differs from Customer C id",
    customerAAuthorized.customer.id,
    customerCAuthorized.customer.id,
  );
}
