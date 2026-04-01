import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestSnapshot";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_snapshot_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and authenticate
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
  // 2. Submit admin promotion request as customer
  const promotionRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "request status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "actor type is customer",
    promotionRequest.actor_type,
    "customer",
  );
  // 3. Create super administrator account and authenticate
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
  // 4. Approve the promotion request (creates approved snapshot)
  const updatedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  TestValidator.equals(
    "request status is approved",
    updatedRequest.status,
    "approved",
  );
  // 5. Retrieve all snapshots
  const allSnapshots =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      customerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "has at least 1 snapshot",
    allSnapshots.data.length >= 1,
  );
  // 6. Filter snapshots by status = 'pending'
  const pendingSnapshots =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      customerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshots);
  for (const snapshot of pendingSnapshots.data) {
    TestValidator.equals(
      "snapshot status is pending",
      snapshot.status,
      "pending",
    );
  }
  TestValidator.equals(
    "pagination records match data length",
    pendingSnapshots.pagination.records,
    pendingSnapshots.data.length,
  );
  // 7. Filter snapshots by status = 'approved'
  const approvedSnapshots =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      customerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  TestValidator.predicate(
    "approved snapshots exist",
    approvedSnapshots.data.length >= 1,
  );
  for (const snapshot of approvedSnapshots.data) {
    TestValidator.equals(
      "snapshot status is approved",
      snapshot.status,
      "approved",
    );
  }
  TestValidator.equals(
    "pagination records match data length",
    approvedSnapshots.pagination.records,
    approvedSnapshots.data.length,
  );
  // 8. Filter snapshots by actor_type = 'customer'
  const customerTypeSnapshots =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      customerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
          actor_type: "customer",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(customerTypeSnapshots);
  TestValidator.predicate(
    "customer type snapshots exist",
    customerTypeSnapshots.data.length >= 1,
  );
  for (const snapshot of customerTypeSnapshots.data) {
    TestValidator.equals(
      "snapshot actor type is customer",
      snapshot.actorType,
      "customer",
    );
  }
  TestValidator.equals(
    "pagination records match data length",
    customerTypeSnapshots.pagination.records,
    customerTypeSnapshots.data.length,
  );
  // 9. Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeSnapshots =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      customerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshots);
  TestValidator.predicate(
    "date range snapshots exist",
    dateRangeSnapshots.data.length >= 1,
  );
  for (const snapshot of dateRangeSnapshots.data) {
    const createdAt = new Date(snapshot.createdAt);
    TestValidator.predicate(
      "snapshot created within range",
      createdAt >= yesterday && createdAt <= tomorrow,
    );
  }
  TestValidator.equals(
    "pagination records match data length",
    dateRangeSnapshots.pagination.records,
    dateRangeSnapshots.data.length,
  );
  // 10. Test combined filters (status + actor_type)
  const combinedSnapshots =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      customerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
          status: "approved",
          actor_type: "customer",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedSnapshots);
  TestValidator.predicate(
    "combined filter snapshots exist",
    combinedSnapshots.data.length >= 1,
  );
  for (const snapshot of combinedSnapshots.data) {
    TestValidator.equals(
      "snapshot status is approved",
      snapshot.status,
      "approved",
    );
    TestValidator.equals(
      "snapshot actor type is customer",
      snapshot.actorType,
      "customer",
    );
  }
  TestValidator.equals(
    "pagination records match data length",
    combinedSnapshots.pagination.records,
    combinedSnapshots.data.length,
  );
  // 11. Verify pagination metadata accuracy
  TestValidator.predicate(
    "current page is valid",
    allSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    allSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    allSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    allSnapshots.pagination.pages >= 0,
  );
}
