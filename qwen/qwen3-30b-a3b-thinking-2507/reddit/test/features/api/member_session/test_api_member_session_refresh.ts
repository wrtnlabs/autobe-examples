import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const registrationResponse = (await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    },
  })) satisfies ICommunityMember.IAuthorized;
  memberConnection.headers = {
    Authorization: `Bearer ${registrationResponse.access}`,
  };
  const sessionRefreshResponse =
    (await api.functional.community.member.sessions.refresh(memberConnection, {
      body: {
        id: registrationResponse.id,
      },
    })) satisfies ICommunityMemberSession;
  typia.assert(sessionRefreshResponse);
  const now = new Date();
  const newExpiration = new Date(sessionRefreshResponse.expired_at);
  const requiredTime = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "New session expiration must be at least 7 days from current time",
    newExpiration.getTime() >= requiredTime,
  );
}
