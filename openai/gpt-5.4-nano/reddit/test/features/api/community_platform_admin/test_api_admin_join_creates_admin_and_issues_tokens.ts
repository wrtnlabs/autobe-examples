import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_creates_admin_and_issues_tokens(
  connection: api.IConnection,
): Promise<void> {
  const adminJoinEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: adminJoinEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "admin email matches input",
    authorized.email,
    adminJoinEmail,
  );
  TestValidator.equals(
    "admin is active (deleted_at is null)",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access expired_at exists",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    authorized.token.refreshable_until.length > 0,
  );
  // Duplicate join with same email should be rejected
  const duplicateAdminConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate admin join should be rejected",
    [400, 409, 422],
    async () =>
      await authorize_admin_join(duplicateAdminConnection, {
        body: {
          email: adminJoinEmail,
          password: adminPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ICommunityPlatformAdmin.IJoin,
      }),
  );
}
