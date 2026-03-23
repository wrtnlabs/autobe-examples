import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request";

export async function test_api_admin_request_lifecycle_retrieval_variations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account for testing
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create multiple admin requests with different lifecycle stages
  // 2.1. Pending request
  const pendingRequest =
    await generate_random_ecommerce_mall_admin_admin_requests_create(
      connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallAdminRequest.ICreate,
      },
    );
  // 2.2. Approved request
  const approvedRequest =
    await generate_random_ecommerce_mall_admin_admin_requests_create(
      connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallAdminRequest.ICreate,
      },
    );
  // 2.3. Rejected request
  const rejectedRequest =
    await generate_random_ecommerce_mall_admin_admin_requests_create(
      connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallAdminRequest.ICreate,
      },
    );
  // 3. Test retrieval of requests at various lifecycle stages
  // 3.1. Retrieve pending request
  const retrievedPending =
    await api.functional.ecommerceMall.admin.admin_requests.at(
      superAdminConnection,
      {
        adminRequestId: pendingRequest.id,
      },
    );
  typia.assert(retrievedPending);
  TestValidator.equals(
    "pending request status",
    retrievedPending.status,
    "pending",
  );
  TestValidator.equals(
    "pending request reason",
    retrievedPending.reason,
    pendingRequest.reason,
  );
  TestValidator.equals(
    "pending request superAdmin is null",
    retrievedPending.superAdmin,
    null,
  );
  // 3.2. Retrieve approved request
  const retrievedApproved =
    await api.functional.ecommerceMall.admin.admin_requests.at(
      superAdminConnection,
      {
        adminRequestId: approvedRequest.id,
      },
    );
  typia.assert(retrievedApproved);
  TestValidator.equals(
    "approved request status",
    retrievedApproved.status,
    "approved",
  );
  TestValidator.notEquals(
    "approved request superAdmin is not null",
    retrievedApproved.superAdmin,
    null,
  );
  TestValidator.equals(
    "approved request superAdmin matches",
    retrievedApproved.superAdmin?.id,
    superAdmin.id,
  );
  // 3.3. Retrieve rejected request
  const retrievedRejected =
    await api.functional.ecommerceMall.admin.admin_requests.at(
      superAdminConnection,
      {
        adminRequestId: rejectedRequest.id,
      },
    );
  typia.assert(retrievedRejected);
  TestValidator.equals(
    "rejected request status",
    retrievedRejected.status,
    "rejected",
  );
  TestValidator.notEquals(
    "rejected request superAdmin is not null",
    retrievedRejected.superAdmin,
    null,
  );
  TestValidator.equals(
    "rejected request superAdmin matches",
    retrievedRejected.superAdmin?.id,
    superAdmin.id,
  );
  TestValidator.notEquals(
    "rejected request has rejectionReason",
    retrievedRejected.rejectionReason,
    null,
  );
}
