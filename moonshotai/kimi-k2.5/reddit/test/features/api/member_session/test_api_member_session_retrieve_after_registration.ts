import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path where a guest registers as a new member and immediately retrieves their session information.
 * Steps: 1) Call authorize_member_join utility to register a new member with email, username, and password. This creates a member account, generates JWT tokens, and establishes a session.
 * 2) Using the authenticated connection, call GET /redditLike/member/sessions/me to retrieve current session details.
 * Validate that the response contains: session id (UUID), actorType as "member", actor object with member details (id, email, username, emailVerified=false, createdAt), connection metadata (ip, href, referrer, userAgent), createdAt timestamp, and expiresAt timestamp.
 * Verify that the session metadata matches the join request context and that emailVerified is false for newly registered members.
 */
export async function test_api_member_session_retrieve_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection for the member and register
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies IRedditLikeMember.IJoin;
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorizedMember);
  // 2. Retrieve session information using the authenticated connection
  const session =
    await api.functional.redditLike.member.sessions.me.at(memberConnection);
  typia.assert(session);
  // 3. Validate session structure and business logic
  TestValidator.equals("actorType is member", session.actorType, "member");
  TestValidator.equals(
    "actor email matches join input",
    (session.actor as IRedditLikeMember.ISummary).email,
    joinBody.email,
  );
  TestValidator.equals(
    "actor username matches join input",
    (session.actor as IRedditLikeMember.ISummary).username,
    joinBody.username,
  );
  TestValidator.predicate(
    "emailVerified is false for new member",
    (session.actor as IRedditLikeMember.ISummary).emailVerified === false,
  );
  TestValidator.equals(
    "actor id matches authorized member id",
    (session.actor as IRedditLikeMember.ISummary).id,
    authorizedMember.id,
  );
}
