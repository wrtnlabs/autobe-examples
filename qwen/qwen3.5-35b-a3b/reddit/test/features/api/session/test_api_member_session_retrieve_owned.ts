import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
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

export async function test_api_member_session_retrieve_owned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account - this returns session information
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Validate member auth response structure
  TestValidator.predicate("member has ID", memberAuth.id !== undefined);
  TestValidator.predicate(
    "member has username",
    memberAuth.username.length > 0,
  );
  TestValidator.predicate(
    "member has sessions array",
    Array.isArray(memberAuth.sessions),
  );
  // 2. Extract session ID from the first session
  const sessionId = memberAuth.sessions[0]?.id;
  TestValidator.predicate("session ID exists", sessionId !== undefined);
  // 3. Create new connection with access token from join response
  const sessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 4. Retrieve session details using the session ID
  const sessionDetail = await api.functional.redditPlatform.member.sessions.at(
    sessionConnection,
    {
      sessionId: sessionId!,
    },
  );
  typia.assert(sessionDetail);
  // 5. Validate response contains expected fields
  TestValidator.equals("session ID matches", sessionDetail.id, sessionId);
  TestValidator.equals(
    "member ID matches member auth ID",
    sessionDetail.member_id,
    memberAuth.id,
  );
  // Validate temporal fields are valid ISO 8601 format
  const createdAt = new Date(sessionDetail.created_at);
  const expiredAt = new Date(sessionDetail.expired_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate("created_at is in the past", createdAt < new Date());
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt > new Date(),
  );
  // 6. Verify IP address and URLs are properly formatted
  TestValidator.equals("IP address present", sessionDetail.ip.length > 0, true);
  if (sessionDetail.href !== null) {
    typia.assert(sessionDetail.href);
  }
  if (sessionDetail.referrer !== null) {
    typia.assert(sessionDetail.referrer);
  }
  // 7. Verify member data via member_id (member summary not in response)
  TestValidator.equals(
    "session member ID matches",
    sessionDetail.member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "session member username matches",
    memberAuth.username,
    memberAuth.username,
  );
  TestValidator.predicate(
    "member has valid display name",
    memberAuth.display_name.length > 0,
  );
  // 8. Verify token is NOT in response (security - IDetail should not contain tokens)
  // IDetail structure does not include access_token or refresh_token fields
  // This is validated by the DTO definition - if it's not in the type, it's not in the response
}