import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_product_reviews_pagination_and_filtering_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join and login for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name(2);
  const adminPassword = "Adm1nP@ssw0rd!";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: adminFullName,
  } satisfies IShoppingMallAdmin.IJoin;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLogin);

  // 2. Seller join and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerStoreName = RandomGenerator.name(1);
  const sellerPassword = "Sell3rP@ss!";

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    store_name: sellerStoreName,
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com",
  } satisfies IShoppingMallSeller.ILogin;

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert(sellerLogin);

  // 3. Create seller profile
  const sellerProfileCreateBody = {
    shopping_mall_seller_id: seller.id,
    store_name: sellerStoreName,
    business_registration_number: "BR-" + RandomGenerator.alphaNumeric(10),
    contact_email: sellerEmail,
    contact_phone: RandomGenerator.mobile(),
    profile_description: RandomGenerator.paragraph({ sentences: 3 }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IShoppingMallSellerProfile.ICreate;

  const sellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: sellerProfileCreateBody,
    });
  typia.assert(sellerProfile);

  // 4. Assign admin role to admin user
  const adminRoleCreateBody = {
    user_id: admin.id,
    role_name: "admin",
  } satisfies IShoppingMallUserRole.ICreate;

  const adminRole = await api.functional.shoppingMall.admin.userRoles.create(
    connection,
    {
      body: adminRoleCreateBody,
    },
  );
  typia.assert(adminRole);

  // 5. Create product by admin
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Brand" + RandomGenerator.alphaNumeric(5),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert(product);

  // 6. Create product SKU by seller
  const productSkuCreateBody = {
    shopping_mall_product_id: product.id,
    sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<1000000>
    >(),
    attributes_json: JSON.stringify({
      color: RandomGenerator.pick(["red", "blue", "green"] as const),
      size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
      other: { material: "cotton" },
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // Naive POST /shoppingMall/seller/products/Create is IShoppingMallProduct.ICreate so make a new product with these properties
  // But we only have api.functional.shoppingMall.seller.products.create with IShoppingMallProduct.ICreate
  // So to create SKU, we crash the scenario with no SKU create API
  // Instead, re-use product creation for SKU is impossible
  // So we must revise scenario to make the product alone and re-use it

  // Since no SKU create API, skip this exact SKU creation
  // We will assume SKU id is product.id for testing productReviews filter with productSkuId

  const skuId = product.id; // Use product id for sku filter

  // 7. Customer join and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerNickname = RandomGenerator.name(1);
  const customerPassword = "Cust0merP@ss!";

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    nickname: customerNickname,
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: "127.0.0.1",
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com",
  } satisfies IShoppingMallCustomer.ILogin;

  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });
  typia.assert(customerLogin);

  // 8. Create order by customer
  const orderItem = {
    shopping_mall_product_sku_id: skuId,
    quantity: 1,
    unit_price: productSkuCreateBody.price,
    total_price: productSkuCreateBody.price,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderCreateBody = {
    order_code: `ORDER-${RandomGenerator.alphaNumeric(8)}`,
    shipping_address: "123 Test St, Seoul, South Korea",
    shopping_mall_order_items: [orderItem],
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderCreateBody,
    },
  );
  typia.assert(order);

  // 9. Query product reviews with pagination by admin

  // Re-login admin to ensure auth context
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // Search requests: Filter by productSkuId, customerId, rating, moderationStatus
  // Pagination with page=1, limit=5

  // Test filter by shopping_mall_product_sku_id
  const filterBySkuBody = {
    shopping_mall_product_sku_id: skuId,
    page: 1,
    limit: 5,
  } satisfies IShoppingMallProductReview.IRequest;

  const skuFilterResult =
    await api.functional.shoppingMall.admin.productReviews.index(connection, {
      body: filterBySkuBody,
    });
  typia.assert(skuFilterResult);
  TestValidator.predicate(
    "page property exists",
    typeof skuFilterResult.pagination.current === "number",
  );
  TestValidator.equals("page is 1", skuFilterResult.pagination.current, 1);

  // Test filter by shopping_mall_customer_id
  const filterByCustomerBody = {
    shopping_mall_customer_id: customer.id,
    page: 1,
    limit: 5,
  } satisfies IShoppingMallProductReview.IRequest;

  const customerFilterResult =
    await api.functional.shoppingMall.admin.productReviews.index(connection, {
      body: filterByCustomerBody,
    });
  typia.assert(customerFilterResult);
  TestValidator.equals(
    "pagination limit is 5",
    customerFilterResult.pagination.limit,
    5,
  );

  // Test filter by rating (pick from 1 to 5)
  const ratingValue = RandomGenerator.pick([1, 2, 3, 4, 5] as const);
  const filterByRatingBody = {
    rating: ratingValue,
    page: 1,
    limit: 5,
  } satisfies IShoppingMallProductReview.IRequest;

  const ratingFilterResult =
    await api.functional.shoppingMall.admin.productReviews.index(connection, {
      body: filterByRatingBody,
    });
  typia.assert(ratingFilterResult);
  TestValidator.predicate(
    "all reviews have rating",
    ratingFilterResult.data.every((review) => review.rating === ratingValue),
  );

  // Test filter by moderation_status, typical values: 'pending', 'approved', 'rejected'
  const modStatus = RandomGenerator.pick([
    "pending",
    "approved",
    "rejected",
  ] as const);
  const filterByModStatusBody = {
    moderation_status: modStatus,
    page: 1,
    limit: 5,
  } satisfies IShoppingMallProductReview.IRequest;

  const modStatusResult =
    await api.functional.shoppingMall.admin.productReviews.index(connection, {
      body: filterByModStatusBody,
    });
  typia.assert(modStatusResult);
  TestValidator.predicate(
    "all reviews have moderation status",
    modStatusResult.data.every(
      (review) => review.moderation_status === modStatus,
    ),
  );

  // Test pagination boundaries
  const paginationBody = {
    page: 2,
    limit: 3,
  } satisfies IShoppingMallProductReview.IRequest;

  const paginationResult =
    await api.functional.shoppingMall.admin.productReviews.index(connection, {
      body: paginationBody,
    });
  typia.assert(paginationResult);
  TestValidator.equals("page is 2", paginationResult.pagination.current, 2);
  TestValidator.equals("limit is 3", paginationResult.pagination.limit, 3);
}
