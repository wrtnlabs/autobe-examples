import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_active_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as a member via join (creates a session)
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Step 2: Retrieve the session using the member's session
  // Note: In the current API structure, we use the member ID as reference
  // The session is created during join and the backend tracks sessions per member
  const session = await api.functional.communityPlatform.member.sessions.at(
    memberConnection,
    {
      sessionId: authorizedMember.id,
    },
  );
  typia.assert(session);
  // Step 3: Validate session belongs to the authenticated member
  TestValidator.equals(
    "session belongs to member",
    session.member.id,
    authorizedMember.id,
  );
  // Step 4: Validate member summary matches
  TestValidator.equals(
    "member username matches",
    session.member.username,
    authorizedMember.username,
  );
  TestValidator.equals(
    "member display_name matches",
    session.member.display_name,
    authorizedMember.displayName,
  );
  TestValidator.equals(
    "member karma matches",
    session.member.karma,
    authorizedMember.karma,
  );
  TestValidator.equals(
    "member created_at matches",
    session.member.created_at,
    authorizedMember.createdAt,
  );
  // Step 5: Validate session is active
  TestValidator.equals(
    "sessionStatus is active",
    session.sessionStatus,
    "active",
  );
  TestValidator.equals(
    "deletedAt is null for active session",
    session.deletedAt,
    null,
  );
  // Step 6: Validate session age is non-negative
  TestValidator.predicate(
    "sessionAge is non-negative",
    session.sessionAge >= 0,
  );
}
