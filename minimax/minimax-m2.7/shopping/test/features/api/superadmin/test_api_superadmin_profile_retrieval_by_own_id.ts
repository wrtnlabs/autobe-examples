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

export async function test_api_superadmin_profile_retrieval_by_own_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new super administrator account
  const registered: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(registered);
  // Step 2: Extract superAdminId from registration response
  const superAdminId: string & tags.Format<"uuid"> = registered.id;
  // Step 3: Create authenticated connection with the token from registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = `Bearer ${registered.token.access}`;
  // Step 4: Call GET /ecommerceMall/superAdmin/super-admins/{superAdminId}
  const profile: IEcommerceMallSuperAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admins.at(
      superAdminConnection,
      { superAdminId },
    );
  // Step 5: Validate response with typia.assert (validates ALL properties)
  typia.assert(profile);
  // Step 6: Verify id matches the extracted superAdminId
  TestValidator.equals("super admin id matches", profile.id, superAdminId);
  // Step 7: Verify email matches from registration
  TestValidator.equals("email matches", profile.email, registered.email);
  // Step 8: Verify timestamps are valid ISO datetime strings
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.updated_at),
  );
  // Step 9: Verify password_hash is NOT present (security check)
  TestValidator.predicate(
    "password_hash not included in response",
    !("password_hash" in profile),
  );
}
