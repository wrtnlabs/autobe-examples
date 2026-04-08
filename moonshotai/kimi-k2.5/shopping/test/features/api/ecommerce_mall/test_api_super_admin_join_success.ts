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

export async function test_api_super_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  const superAdminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const result = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email,
      password: "SecurePassword123!",
    },
  });
  typia.assert(result);
  TestValidator.equals("email matches", result.email, email);
  TestValidator.equals("grade is super_admin", result.grade, "super_admin");
  TestValidator.equals("deletedAt is null", result.deletedAt, null);
  TestValidator.predicate(
    "access token exists",
    () => result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    () => !isNaN(new Date(result.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    () => !isNaN(new Date(result.token.refreshable_until).getTime()),
  );
  typia.assertGuard(superAdminConnection.headers);
  await TestValidator.predicate("authorization header set", () =>
    String(superAdminConnection.headers!["Authorization"] ?? "").startsWith("Bearer"),
  );
}