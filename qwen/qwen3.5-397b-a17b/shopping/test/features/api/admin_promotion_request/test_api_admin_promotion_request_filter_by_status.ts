import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create customer with promotion request (will be pending)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  const customerRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(customerRequest);
  TestValidator.equals(
    "customer request status is pending",
    customerRequest.status,
    "pending",
  );
  // 3. Create seller with promotion request (will be pending)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const sellerRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(sellerRequest);
  TestValidator.equals(
    "seller request status is pending",
    sellerRequest.status,
    "pending",
  );
  // 4. Create another customer request to approve
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer2);
  const customer2Request =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customer2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(customer2Request);
  // 5. Approve customer2 request
  const approvedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.approve(
      superAdminConnection,
      {
        requestId: customer2Request.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "approved request status",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "approved request rejection_reason is null",
    approvedRequest.rejection_reason,
    null,
  );
  // 6. Reject seller request
  const rejectedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.reject(
      superAdminConnection,
      {
        requestId: sellerRequest.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAdminPromotionRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "rejected request status",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejected request has rejection_reason",
    rejectedRequest.rejection_reason !== null &&
      rejectedRequest.rejection_reason !== undefined,
  );
  // 7. Test filtering by pending status
  const pendingResult =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending filter returns only pending requests",
    pendingResult.data.every((req) => req.status === "pending"),
  );
  TestValidator.equals(
    "pending count matches filtered results",
    pendingResult.data.length,
    pendingResult.pagination.records,
  );
  // 8. Test filtering by approved status
  const approvedResult =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "approved filter returns only approved requests",
    approvedResult.data.every((req) => req.status === "approved"),
  );
  TestValidator.predicate(
    "approved requests have null rejection_reason",
    approvedResult.data.every((req) => req.rejection_reason === null),
  );
  // 9. Test filtering by rejected status
  const rejectedResult =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.predicate(
    "rejected filter returns only rejected requests",
    rejectedResult.data.every((req) => req.status === "rejected"),
  );
  TestValidator.predicate(
    "rejected requests have rejection_reason populated",
    rejectedResult.data.every(
      (req) =>
        req.rejection_reason !== null && req.rejection_reason !== undefined,
    ),
  );
  // 10. Test combined filtering with status and date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns requests within range",
    dateRangeResult.data.every(
      (req) =>
        new Date(req.created_at) >= yesterday &&
        new Date(req.created_at) <= tomorrow,
    ),
  );
  TestValidator.predicate(
    "date range filter maintains status filter",
    dateRangeResult.data.every((req) => req.status === "pending"),
  );
  // 11. Test filtering by actor_type
  const customerRequestsResult =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          actor_type: "customer",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(customerRequestsResult);
  TestValidator.predicate(
    "actor_type filter returns only customer requests",
    customerRequestsResult.data.every((req) => req.actor_type === "customer"),
  );
  const sellerRequestsResult =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          actor_type: "seller",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sellerRequestsResult);
  TestValidator.predicate(
    "actor_type filter returns only seller requests",
    sellerRequestsResult.data.every((req) => req.actor_type === "seller"),
  );
  // 12. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    pendingResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    pendingResult.pagination.limit >= 1 &&
      pendingResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pendingResult.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    pendingResult.pagination.pages,
    Math.ceil(
      pendingResult.pagination.records / pendingResult.pagination.limit,
    ),
  );
}
