import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  const issuedToken: IAuthorizationToken = joined.token;
  const invalidRefresh = RandomGenerator.alphaNumeric(64);
  TestValidator.notEquals(
    "invalid refresh differs from issued refresh",
    invalidRefresh,
    issuedToken.refresh,
  );
  const invalidRefreshConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "refresh rejects non-existent session credential",
    async () => {
      await authorize_member_refresh(invalidRefreshConnection, {
        body: {
          refresh: invalidRefresh,
        } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
  TestValidator.equals(
    "issued refresh token remains unchanged after failed refresh attempt",
    issuedToken.refresh,
    joined.token.refresh,
  );
}
