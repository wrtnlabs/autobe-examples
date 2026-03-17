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

export async function test_api_super_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate credentials for super administrator
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  // 2. Create super administrator account for testing
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_super_admin_join(joinConnection, {
    body: {
      email: email,
      password: password,
      display_name: displayName,
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(joinOutput);
  // 3. Login with stored credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginOutput = await authorize_super_admin_login(loginConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  typia.assert(loginOutput);
  // 4. Validate response fields
  TestValidator.equals("email matches login input", loginOutput.email, email);
  TestValidator.equals("status is active", loginOutput.status, "active");
  TestValidator.equals(
    "display name matches",
    loginOutput.displayName,
    joinOutput.displayName,
  );
  TestValidator.equals(
    "full name matches",
    loginOutput.fullName,
    joinOutput.fullName,
  );
  TestValidator.equals("id matches", loginOutput.id, joinOutput.id);
  TestValidator.equals("grade matches", loginOutput.grade, joinOutput.grade);
  TestValidator.equals(
    "created at matches",
    loginOutput.createdAt,
    joinOutput.createdAt,
  );
  TestValidator.equals(
    "updated at matches",
    loginOutput.updatedAt,
    joinOutput.updatedAt,
  );
  TestValidator.equals(
    "deleted at matches",
    loginOutput.deletedAt,
    joinOutput.deletedAt,
  );
  // 5. Validate tokens are non-empty strings
  TestValidator.predicate(
    "access token non-empty",
    loginOutput.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    loginOutput.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is future date",
    new Date(loginOutput.expired_at) > new Date(),
  );
  // 6. Validate token structure
  TestValidator.equals(
    "token.access matches access",
    loginOutput.token.access,
    loginOutput.access,
  );
  TestValidator.equals(
    "token.refresh matches refresh",
    loginOutput.token.refresh,
    loginOutput.refresh,
  );
  TestValidator.predicate(
    "token.refreshable_until is future date",
    new Date(loginOutput.token.refreshable_until) > new Date(),
  );
  TestValidator.equals(
    "token.expired_at matches expired_at",
    loginOutput.token.expired_at,
    loginOutput.expired_at,
  );
}