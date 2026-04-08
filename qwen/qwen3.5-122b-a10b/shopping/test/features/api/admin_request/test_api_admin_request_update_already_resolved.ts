import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_admin_grades_create } from "../../../generate/generate_random_ecommerce_admin_grades_create";
import { generate_random_ecommerce_requests_create } from "../../../generate/generate_random_ecommerce_requests_create";
import { prepare_random_ecommerce_admin_request } from "../../../prepare/prepare_random_ecommerce_admin_request";
import { prepare_random_ecommerce_administrator_grade } from "../../../prepare/prepare_random_ecommerce_administrator_grade";

/**
 * Test super administrator attempts to update an administrator request that has already been resolved.
 *
 * Validates that when a super admin tries to update a request with status other than 'pending', the system rejects the update with a conflict error. This ensures the business rule that only pending requests can be updated is enforced, preventing double-processing of resolved requests.
 *
 * The test covers both resolution scenarios:
 * 1. Attempting to update an already approved request
 * 2. Attempting to update an already rejected request
 *
 * 1. Register and authenticate as super administrator.
 * 2. Assign super grade to the administrator.
 * 3. Register a regular administrator with pending approval status.
 * 4. Create an admin request as the regular administrator.
 * 5. Approve the request as super admin (status becomes 'approved').
 * 6. Attempt to update the already approved request and verify conflict error.
 * 7. Create another admin request from a different administrator.
 * 8. Reject the request as super admin (status becomes 'rejected').
 * 9. Attempt to update the already rejected request and verify conflict error.
 */
export async function test_api_admin_request_update_already_resolved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin = await api.functional.ecommerce.auth.admin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(superAdminJoin);
  // 2. Assign super grade to the administrator
  const superGrade: IEcommerceAdministratorGrade =
    await api.functional.ecommerce.admin.grades.create(superAdminConnection, {
      body: {
        ecommerce_admin_id: superAdminJoin.id,
        grade: "super",
      } satisfies IEcommerceAdministratorGrade.ICreate,
    });
  typia.assert(superGrade);
  // 3. Register a regular administrator (pending approval)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminJoin = await api.functional.ecommerce.auth.admin.join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(regularAdminJoin);
  // 4. Create an admin request as the regular administrator
  const adminRequest1: IEcommerceAdminRequest =
    await api.functional.ecommerce.requests.create(regularAdminConnection, {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceAdminRequest.ICreate,
    });
  typia.assert(adminRequest1);
  TestValidator.equals(
    "initial status pending",
    adminRequest1.status,
    "pending",
  );
  // 5. Approve the request as super admin (status becomes 'approved')
  const approvedRequest: IEcommerceAdminRequest =
    await api.functional.ecommerce.admin.requests.update(superAdminConnection, {
      requestId: adminRequest1.id,
      body: {
        status: "approved",
      } satisfies IEcommerceAdminRequest.IUpdate,
    });
  typia.assert(approvedRequest);
  TestValidator.equals("status approved", approvedRequest.status, "approved");
  // 6. Attempt to update the already approved request (should fail with conflict)
  await TestValidator.error(
    "updating approved request should fail",
    async () => {
      await api.functional.ecommerce.admin.requests.update(
        superAdminConnection,
        {
          requestId: adminRequest1.id,
          body: {
            status: "rejected",
            rejection_reason: "Cannot update already resolved request",
          } satisfies IEcommerceAdminRequest.IUpdate,
        },
      );
    },
  );
  // 7. Create another admin request from a different administrator
  const anotherAdminConnection: api.IConnection = { host: connection.host };
  const anotherAdminJoin = await api.functional.ecommerce.auth.admin.join(
    anotherAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(anotherAdminJoin);
  const adminRequest2: IEcommerceAdminRequest =
    await api.functional.ecommerce.requests.create(anotherAdminConnection, {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceAdminRequest.ICreate,
    });
  typia.assert(adminRequest2);
  TestValidator.equals(
    "initial status pending",
    adminRequest2.status,
    "pending",
  );
  // 8. Reject the request as super admin (status becomes 'rejected')
  const rejectedRequest: IEcommerceAdminRequest =
    await api.functional.ecommerce.admin.requests.update(superAdminConnection, {
      requestId: adminRequest2.id,
      body: {
        status: "rejected",
        rejection_reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceAdminRequest.IUpdate,
    });
  typia.assert(rejectedRequest);
  TestValidator.equals("status rejected", rejectedRequest.status, "rejected");
  // 9. Attempt to update the already rejected request (should fail with conflict)
  await TestValidator.error(
    "updating rejected request should fail",
    async () => {
      await api.functional.ecommerce.admin.requests.update(
        superAdminConnection,
        {
          requestId: adminRequest2.id,
          body: {
            status: "approved",
          } satisfies IEcommerceAdminRequest.IUpdate,
        },
      );
    },
  );
}
