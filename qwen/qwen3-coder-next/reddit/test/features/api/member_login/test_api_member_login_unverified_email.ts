import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_unverified_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create unverified member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(joinResponse);
  // 2. Try to login with unverified account (should fail)
  await TestValidator.error(
    "should reject unverified email login",
    async () => {
      await api.functional.redditPlatform.auth.member.login(memberConnection, {
        body: {
          email: joinResponse.email,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IRedditPlatformMember.ILogin,
      });
    },
  );
}
