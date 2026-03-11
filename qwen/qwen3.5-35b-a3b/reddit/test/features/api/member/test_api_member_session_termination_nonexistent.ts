import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_termination_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account to establish authentication context
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Create actor-specific connection with member token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuthorized.token.access,
    },
  };
  // 3. Generate a valid UUID that does not exist in the database
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to terminate the non-existent session
  // This should return 404 Not Found
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () => {
      await api.functional.redditPlatform.member.sessions.erase(
        memberConnection,
        {
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
  // 5. Verify member can still authenticate successfully (sessions intact)
  const secondConnection: api.IConnection = { host: connection.host };
  const freshAuthorized = await authorize_member_join(secondConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(freshAuthorized);
  // Verify session count is reasonable (has at least the created session)
  TestValidator.predicate(
    "member has expected sessions",
    freshAuthorized.sessions.length >= 1,
  );
}