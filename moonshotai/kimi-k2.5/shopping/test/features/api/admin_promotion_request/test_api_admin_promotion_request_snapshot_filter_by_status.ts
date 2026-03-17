import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test filtering admin promotion request snapshots by status transitions.
 *
 * 1. Register super admin account
 * 2. Register two customer accounts
 * 3. Submit admin promotion requests from both customers
 * 4. Approve first request and reject second request as super admin
 * 5. Verify snapshots can be filtered by newStatus to show only approved transition
 * 6. Verify snapshots can be filtered by newStatus to show only rejected transition with reason
 */
export async function test_api_admin_promotion_request_snapshot_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://localhost/superAdmin/join",
        referrer: "https://localhost",
        ip: "127.0.0.1",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create customer 1
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {});
  typia.assert(customer1);
  // 3. Create customer 2
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {});
  typia.assert(customer2);
  // 4. Submit promotion request as customer 1
  const request1 =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customer1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(request1);
  // 5. Submit promotion request as customer 2
  const request2 =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customer2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(request2);
  // 6. Approve first request
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        promotionRequestId: request1.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 7. Reject second request with reason
  const rejectedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        promotionRequestId: request2.id,
        body: {
          status: "rejected",
          rejectionReason: "Insufficient qualifications for administrator role",
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 8. Get snapshots for approved request filtered by newStatus='approved'
  const approvedSnapshots =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        promotionRequestId: request1.id,
        body: {
          newStatus: "approved",
        } satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // 9. Validate approved snapshot
  TestValidator.equals(
    "approved snapshots count",
    approvedSnapshots.pagination.records,
    1,
  );
  TestValidator.equals(
    "approved snapshot newStatus",
    approvedSnapshots.data[0].newStatus,
    "approved",
  );
  TestValidator.equals(
    "approved snapshot previousStatus",
    approvedSnapshots.data[0].previousStatus,
    "pending",
  );
  // 10. Get snapshots for rejected request filtered by newStatus='rejected'
  const rejectedSnapshots =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        promotionRequestId: request2.id,
        body: {
          newStatus: "rejected",
        } satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // 11. Validate rejected snapshot includes rejection reason
  TestValidator.equals(
    "rejected snapshots count",
    rejectedSnapshots.pagination.records,
    1,
  );
  TestValidator.equals(
    "rejected snapshot newStatus",
    rejectedSnapshots.data[0].newStatus,
    "rejected",
  );
  TestValidator.equals(
    "rejected snapshot previousStatus",
    rejectedSnapshots.data[0].previousStatus,
    "pending",
  );
  TestValidator.equals(
    "rejected snapshot newReason",
    rejectedSnapshots.data[0].newReason,
    "Insufficient qualifications for administrator role",
  );
}
