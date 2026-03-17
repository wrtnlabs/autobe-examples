import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_credential_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const correctPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const wrongPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();
  const joinBody = {
    email,
    password: correctPassword,
    href,
    referrer,
    ip,
  } satisfies ICommunityPlatformMember.IJoin;
  const joined = await authorize_member_join(memberJoinConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals(
    "joined member email matches registration",
    joined.email,
    email,
  );
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password: wrongPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.ILogin;
  TestValidator.notEquals(
    "wrong password differs from registered password",
    wrongPassword,
    correctPassword,
  );
  await TestValidator.httpError(
    "member login rejects mismatched password",
    [400, 401, 403, 404],
    async () => {
      await authorize_member_login(memberLoginConnection, {
        body: loginBody,
      });
    },
  );
  TestValidator.equals(
    "failed login does not attach authorization header",
    memberLoginConnection.headers?.Authorization,
    undefined,
  );
}
