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

export async function test_api_admin_refresh_account_state_denied(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const joined = await authorize_admin_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals(
    "joined email matches input",
    joined.email,
    joinBody.email,
  );
  TestValidator.notEquals(
    "access and refresh tokens are distinct",
    joined.token.access,
    joined.token.refresh,
  );
  const deniedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh denied when refresh credential is no longer acceptable",
    async () => {
      await authorize_admin_refresh(deniedConnection, {
        body: {
          refresh: `${joined.token.refresh}-revoked`,
        } satisfies ICommunityPlatformAdmin.IRefresh,
      });
    },
  );
}
