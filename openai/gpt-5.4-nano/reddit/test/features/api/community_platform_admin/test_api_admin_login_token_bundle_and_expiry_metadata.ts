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

export async function test_api_admin_login_token_bundle_and_expiry_metadata(
  connection: api.IConnection,
): Promise<void> {
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joined = await authorize_admin_join(adminJoinConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(joined);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const logged = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: joined.email,
      password,
    },
  });
  typia.assert(logged);
  TestValidator.equals("admin id matches join", logged.id, joined.id);
  TestValidator.equals("admin email matches join", logged.email, joined.email);
  TestValidator.equals(
    "deleted_at is null for active admin",
    logged.deleted_at,
    null,
  );
  const expiredAt = new Date(logged.token.expired_at).getTime();
  const refreshableUntil = new Date(logged.token.refreshable_until).getTime();
  TestValidator.predicate(
    "token ordering expired_at <= refreshable_until",
    expiredAt <= refreshableUntil,
  );
}
