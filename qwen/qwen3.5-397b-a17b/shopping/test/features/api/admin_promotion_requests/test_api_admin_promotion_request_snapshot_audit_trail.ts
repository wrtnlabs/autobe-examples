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

export async function test_api_admin_promotion_request_snapshot_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for reuse
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Setup: Register super administrator
  const superAdminAuth = await authorize_super_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(superAdminAuth);
  // 2. Login as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminConnection, {
    body: {
      email: superAdminAuth.email,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.ILogin,
  });
  // 3. Setup: Register customer
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 5. Submit first admin promotion request as customer
  const firstRequestReason = RandomGenerator.paragraph({ sentences: 3 });
  const firstRequest =
    await api.functional.shoppingMall.customer.admin_promotion_requests.create(
      customerConnection,
      {
        body: {
          reason: firstRequestReason,
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals("first request status", firstRequest.status, "pending");
  TestValidator.equals(
    "first request reason matches",
    firstRequest.reason,
    firstRequestReason,
  );
  // 6. Super administrator rejects the first request with a reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.reject(
      superAdminConnection,
      {
        requestId: firstRequest.id,
        body: {
          reason: rejectionReason,
        } satisfies IShoppingMallAdminPromotionRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "rejected request status",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedRequest.rejection_reason,
    rejectionReason,
  );
  // 7. Customer submits second promotion request
  const secondRequestReason = RandomGenerator.paragraph({ sentences: 3 });
  const secondRequest =
    await api.functional.shoppingMall.customer.admin_promotion_requests.create(
      customerConnection,
      {
        body: {
          reason: secondRequestReason,
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(secondRequest);
  TestValidator.equals(
    "second request status",
    secondRequest.status,
    "pending",
  );
  // 8. Super administrator approves the second request
  const approvedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.approve(
      superAdminConnection,
      {
        requestId: secondRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "approved request status",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "approved request has null rejection reason",
    approvedRequest.rejection_reason === null,
  );
  // 9. Retrieve snapshots for the rejected request (sorted by created_at ascending)
  const rejectedRequestSnapshots =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: firstRequest.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "asc",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedRequestSnapshots);
  TestValidator.predicate(
    "rejected request has at least 2 snapshots",
    rejectedRequestSnapshots.data.length >= 2,
  );
  // 10. Verify rejected request snapshot audit trail
  const pendingSnapshot = rejectedRequestSnapshots.data.find(
    (s) => s.status === "pending",
  );
  const rejectedSnapshot = rejectedRequestSnapshots.data.find(
    (s) => s.status === "rejected",
  );
  TestValidator.predicate(
    "pending snapshot exists",
    pendingSnapshot !== undefined,
  );
  TestValidator.predicate(
    "rejected snapshot exists",
    rejectedSnapshot !== undefined,
  );
  if (pendingSnapshot && rejectedSnapshot) {
    TestValidator.equals(
      "pending snapshot has null reason",
      pendingSnapshot.reason,
      null,
    );
    TestValidator.predicate(
      "pending snapshot has null responding admin",
      pendingSnapshot.respondingSuperAdministrator === null,
    );
    TestValidator.equals(
      "rejected snapshot has reason",
      rejectedSnapshot.reason,
      rejectionReason,
    );
    TestValidator.predicate(
      "rejected snapshot has responding admin",
      rejectedSnapshot.respondingSuperAdministrator !== null,
    );
    TestValidator.predicate(
      "snapshot timestamps in order",
      pendingSnapshot.createdAt <= rejectedSnapshot.createdAt,
    );
    // Verify responding super administrator info is present
    const respondingAdmin = rejectedSnapshot.respondingSuperAdministrator;
    if (respondingAdmin) {
      TestValidator.equals(
        "responding admin email matches",
        respondingAdmin.email,
        superAdminAuth.email,
      );
    }
  }
  // 11. Retrieve snapshots for the approved request (sorted by created_at ascending)
  const approvedRequestSnapshots =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: secondRequest.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "asc",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedRequestSnapshots);
  TestValidator.predicate(
    "approved request has at least 2 snapshots",
    approvedRequestSnapshots.data.length >= 2,
  );
  // 12. Verify approved request snapshot audit trail
  const approvedPendingSnapshot = approvedRequestSnapshots.data.find(
    (s) => s.status === "pending",
  );
  const approvedSnapshot = approvedRequestSnapshots.data.find(
    (s) => s.status === "approved",
  );
  TestValidator.predicate(
    "approved pending snapshot exists",
    approvedPendingSnapshot !== undefined,
  );
  TestValidator.predicate(
    "approved snapshot exists",
    approvedSnapshot !== undefined,
  );
  if (approvedPendingSnapshot && approvedSnapshot) {
    TestValidator.equals(
      "approved pending snapshot has null reason",
      approvedPendingSnapshot.reason,
      null,
    );
    TestValidator.predicate(
      "approved pending snapshot has null responding admin",
      approvedPendingSnapshot.respondingSuperAdministrator === null,
    );
    TestValidator.predicate(
      "approved snapshot has null reason",
      approvedSnapshot.reason === null,
    );
    TestValidator.predicate(
      "approved snapshot has responding admin",
      approvedSnapshot.respondingSuperAdministrator !== null,
    );
    TestValidator.predicate(
      "approved snapshot timestamps in order",
      approvedPendingSnapshot.createdAt <= approvedSnapshot.createdAt,
    );
    // Verify responding super administrator info is present
    const approvedRespondingAdmin =
      approvedSnapshot.respondingSuperAdministrator;
    if (approvedRespondingAdmin) {
      TestValidator.equals(
        "responding admin email matches",
        approvedRespondingAdmin.email,
        superAdminAuth.email,
      );
    }
  }
  // 13. Verify snapshot immutability - snapshots cannot be modified after creation
  // The API design ensures snapshots are immutable by not providing any update/delete endpoints
  // We verify this by checking that re-fetching returns the same data
  const reFetchedRejectedSnapshots =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: firstRequest.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "asc",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(reFetchedRejectedSnapshots);
  TestValidator.equals(
    "snapshot count remains unchanged",
    reFetchedRejectedSnapshots.data.length,
    rejectedRequestSnapshots.data.length,
  );
  TestValidator.equals(
    "first snapshot ID unchanged",
    reFetchedRejectedSnapshots.data[0].id,
    rejectedRequestSnapshots.data[0].id,
  );
  TestValidator.equals(
    "first snapshot status unchanged",
    reFetchedRejectedSnapshots.data[0].status,
    rejectedRequestSnapshots.data[0].status,
  );
}
