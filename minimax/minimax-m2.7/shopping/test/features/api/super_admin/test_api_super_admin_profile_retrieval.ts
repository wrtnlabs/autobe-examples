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

export async function test_api_super_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator account via POST /auth/superAdmin/join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Extract the superAdminId from the join response
  const { id: superAdminId, email: registeredEmail } = authorized;
  // 3. Call GET /ecommerceMall/superAdmin/super-admins/{superAdminId} with authenticated token
  const profile = await api.functional.ecommerceMall.superAdmin.super_admins.at(
    superAdminConnection,
    {
      superAdminId: superAdminId,
    },
  );
  // 4. Validate response using typia.assert (performs complete type validation)
  typia.assert(profile);
  // 5. Verify response body contains expected fields matching registered account
  TestValidator.equals(
    "id matches registered account",
    profile.id,
    superAdminId,
  );
  TestValidator.equals(
    "email matches registered email",
    profile.email,
    registeredEmail,
  );
  // 6. Verify timestamps are valid ISO datetime format (typia.assert already validates format)
  TestValidator.predicate(
    "createdAt is valid date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.updatedAt),
  );
  // 7. Verify deletedAt is null for active account
  TestValidator.equals(
    "deletedAt is null for active account",
    profile.deletedAt,
    null,
  );
  // 8. Verify password_hash is NEVER included in response (security requirement)
  // typia.assert would fail if password_hash was included (not in IEcommerceMallSuperAdmin schema)
  TestValidator.predicate(
    "password_hash not exposed in response",
    !("password_hash" in profile),
  );
}
