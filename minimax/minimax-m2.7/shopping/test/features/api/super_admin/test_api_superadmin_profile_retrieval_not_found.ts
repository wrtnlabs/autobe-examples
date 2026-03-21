import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that requesting a non-existent super administrator account returns a 404 Not Found error.
 *
 * Steps:
 * 1. Register a super administrator account using POST /auth/superAdmin/join
 * 2. Authenticate as the super admin using POST /auth/superAdmin/login
 * 3. Call GET /ecommerceMall/superAdmin/super-admins/{nonExistentId} with a valid UUID format but non-existent ID
 * 4. Validate response returns 404 Not Found
 * 5. Verify response body indicates the resource was not found
 */
export async function test_api_superadmin_profile_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinHref = typia.random<string & tags.Format<"uri">>();
  const joinReferrer = typia.random<string & tags.Format<"uri">>();
  const joinPassword = typia.random<string & tags.Format<"password">>();
  
  await api.functional.ecommerceMall.auth.superAdmin.join(
    { host: connection.host },
    {
      body: {
        email: joinEmail,
        password: joinPassword,
        href: joinHref,
        referrer: joinReferrer,
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );

  // 2. Login as the super admin to get valid token
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: joinHref,
      referrer: joinReferrer,
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });

  // 3. Call GET with non-existent UUID (valid format but doesn't exist)
  const nonExistentId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;

  // 4 & 5. Validate response returns 404 Not Found
  await TestValidator.httpError(
    "non-existent super admin returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.super_admins.at(
        superAdminConnection,
        {
          superAdminId: nonExistentId,
        },
      );
    },
  );
}