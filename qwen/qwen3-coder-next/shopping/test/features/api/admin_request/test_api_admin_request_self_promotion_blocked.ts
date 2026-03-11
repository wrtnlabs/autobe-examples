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

/**
 * Test super administrator cannot process their own admin request.
 * 1. Create super admin account
 * 2. Login as super admin
 * 3. Super admin submits their own admin request
 * 4. Super admin attempts to approve their own request (should fail with 400)
 * 5. Verify request status remains pending
 */
export async function test_api_admin_request_self_promotion_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials: IEcommerceMallAdmin.ILogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_admin_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  // Login as super admin to get session
  const superAdminSession = await authorize_admin_login(superAdminConnection, {
    body: superAdminCredentials,
  });
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminSession.token.access}`,
  };
  // Super admin submits their own admin request
  const adminRequest =
    await api.functional.ecommerceMall.admin.admin_requests.create(
      superAdminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals(
    "request status is pending",
    adminRequest.status,
    "pending",
  );
  // Super admin attempts to approve their own request (should fail)
  await TestValidator.httpError("cannot process own request", 400, async () => {
    await api.functional.ecommerceMall.admin.admin_requests.update(
      superAdminConnection,
      {
        adminRequestId: adminRequest.id,
        body: {
          status: "approved",
          approval_notes: "Self-promotion attempt",
          rejection_reason: null,
        } satisfies IEcommerceMallAdminRequest.IUpdate,
      },
    );
  });
  // Validate the error response contains expected message about self-promotion
  let caughtError: api.HttpError | null = null;
  try {
    await api.functional.ecommerceMall.admin.admin_requests.update(
      superAdminConnection,
      {
        adminRequestId: adminRequest.id,
        body: {
          status: "approved",
          approval_notes: "Self-promotion attempt",
          rejection_reason: null,
        } satisfies IEcommerceMallAdminRequest.IUpdate,
      },
    );
  } catch (error) {
    if (error instanceof api.HttpError) {
      caughtError = error;
      TestValidator.predicate(
        "error message contains self-promotion indication",
        () =>
          typeof error.message === "string" &&
          (error.message.includes("self") ||
            error.message.includes("Self") ||
            error.message.includes("cannot") ||
            error.message.includes("Self-promotion")),
      );
    } else {
      throw error;
    }
  }
  TestValidator.predicate(
    "error was properly caught",
    () => caughtError !== null,
  );
}
