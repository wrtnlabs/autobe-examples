import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellationRequest";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_platform_admin_search_order_cancellation_requests_with_filters(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) and keep its credentials for later login
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = "Admin!234";

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create basic catalog configuration as platform admin: category tree and brand
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Create a catalog product and SKU under that product
  // We must provide a seller id, but we don't have seller APIs in this scope,
  // so we follow the existing mock style and use a random UUID.
  const randomSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode: string = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const productBody = {
    shopping_mall_seller_id: randomSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 4. Register a customer and keep credentials
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = "Customer!234";

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 5. As customer, create a persistent cart and add the SKU as an item
  const cartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      scenario: "platform-admin-cancellation-search",
    },
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
    note: "test item for cancellation",
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

  // 6. Create an order from the customer's cart
  // IShoppingMallOrder.ICreate has many monetary and address fields; as in
  // mock tests, we use typia.random and override the cart id and basic totals
  // to be consistent but avoid over-assuming upstream address APIs.
  const randomOrderCreate: IShoppingMallOrder.ICreate =
    typia.random<IShoppingMallOrder.ICreate>();

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    ...randomOrderCreate,
    customer_cart_id: cart.id,
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Customer creates an order cancellation request for this order
  const reasonCategory = "changed_mind";

  const cancellationCreateBody = {
    request_reason_category: reasonCategory,
    request_reason_detail: "Customer changed mind after placing order.",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const createdCancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationCreateBody,
      },
    );
  typia.assert(createdCancellation);

  // 8. Switch back to platform admin via login to ensure correct actor context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAfterLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  // 9. As platform admin, search cancellation requests for this order
  const searchRequestBody = {
    page: 1,
    limit: 10,
    request_statuses: undefined,
    actor_types: ["customer"],
    hasLineScope: null,
    created_from: null,
    created_to: null,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallOrderCancellationRequest.IRequest;

  const pageResult: IPageIShoppingMallOrderCancellationRequest.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.cancellationRequests.index(
      connection,
      {
        orderId: order.id,
        body: searchRequestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "pagination limit should match requested limit",
    pagination.limit,
    searchRequestBody.limit,
  );

  TestValidator.predicate(
    "there should be at least one cancellation request for this order",
    pageResult.data.length >= 1 && pagination.records >= 1,
  );

  const matchedByOrderAndReason = pageResult.data.find((summary) => {
    return (
      summary.order.id === order.id && summary.reason_code === reasonCategory
    );
  });

  TestValidator.predicate(
    "search results should include the customer's cancellation request",
    matchedByOrderAndReason !== undefined,
  );

  if (matchedByOrderAndReason !== undefined) {
    TestValidator.predicate(
      "cancellation status should be a non-empty string",
      matchedByOrderAndReason.status.length > 0,
    );

    TestValidator.predicate(
      "cancellation created_at should be a non-empty date-time string",
      matchedByOrderAndReason.created_at.length > 0,
    );
  }

  // 10. Perform a second search using actor_types that should exclude
  // customer-originated requests. We do not assume global emptiness, but
  // we check that our specific customer request is not present when
  // filtering for seller.
  const sellerFilteredRequestBody = {
    page: 1,
    limit: 10,
    request_statuses: undefined,
    actor_types: ["seller"],
    hasLineScope: null,
    created_from: null,
    created_to: null,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallOrderCancellationRequest.IRequest;

  const sellerFilteredPage: IPageIShoppingMallOrderCancellationRequest.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.cancellationRequests.index(
      connection,
      {
        orderId: order.id,
        body: sellerFilteredRequestBody,
      },
    );
  typia.assert(sellerFilteredPage);

  const hasCustomerReasonInSellerView = sellerFilteredPage.data.some(
    (summary) =>
      summary.order.id === order.id && summary.reason_code === reasonCategory,
  );

  TestValidator.predicate(
    "seller-actor filtered search should not return the customer-specific cancellation reason for the same order",
    hasCustomerReasonInSellerView === false,
  );
}
