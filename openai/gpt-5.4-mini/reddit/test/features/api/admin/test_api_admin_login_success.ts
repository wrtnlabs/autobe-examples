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

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const joined = await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "admin email should match login input",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "admin id should match join result",
    authorized.id,
    joined.id,
  );
  TestValidator.equals(
    "deleted_at should remain null",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token should not be empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should not be empty",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until should not be empty",
    authorized.token.refreshable_until.length > 0,
  );
}
