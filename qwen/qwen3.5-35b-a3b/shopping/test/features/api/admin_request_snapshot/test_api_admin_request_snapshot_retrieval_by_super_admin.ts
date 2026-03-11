import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import type { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_admin_request_snapshot_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Setup customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuthorized);
  // 3. Customer submits admin access request
  const adminRequest =
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(adminRequest);
  // 4. Super administrator approves the request, creating snapshot
  const approvedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.review(
      adminConnection,
      {
        requestId: adminRequest.id,
        body: {
          action: "approve",
        } satisfies IEcommerceMallAdminRequestRequest.IReview,
      },
    );
  typia.assert(approvedRequest);
  // 5. Verify snapshot was created
  TestValidator.equals(
    "snapshot count increased",
    approvedRequest.snapshots.length,
    1,
  );
  // 6. Retrieve the snapshot
  const snapshot =
    await api.functional.ecommerceMall.admin.admin_requests.snapshots.at(
      adminConnection,
      {
        adminRequestId: adminRequest.id,
        snapshotId: approvedRequest.snapshots[0].id,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot contains complete audit trail
  TestValidator.equals(
    "snapshot has correct id",
    snapshot.id,
    approvedRequest.snapshots[0].id,
  );
  TestValidator.equals(
    "snapshot reason matches",
    snapshot.reason,
    adminRequest.reason,
  );
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.request_status,
    "approved",
  );
  TestValidator.equals(
    "snapshot changed by is super admin",
    snapshot.changedBy?.id,
    adminAuthorized.id,
  );
  TestValidator.notEquals(
    "timestamp has changed",
    snapshot.changed_at,
    snapshot.created_at,
  );
  TestValidator.equals(
    "admin request id matches",
    snapshot.adminRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "admin request status is approved",
    snapshot.adminRequest.request_status,
    "approved",
  );
}