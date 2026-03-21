import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving an authenticated session by its UUID.
 *
 * Steps:
 * 1. Register a new member account via POST /redditClone/auth/member/join
 * 2. Generate a valid UUID session ID for testing
 * 3. Call GET /redditClone/member/members/sessions/{sessionId}
 * 4. Verify response returns session metadata including:
 *    - Session ID in valid UUID format
 *    - created_at timestamp
 *    - updated_at timestamp
 * 5. Verify email, username, profile, and karma are included
 * 6. Verify session belongs to the authenticated member via email/username
 */
export async function test_api_session_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Generate a session ID for testing
  // In real scenario, session ID would come from a sessions list endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call GET /redditClone/member/members/sessions/{sessionId}
  const session = await api.functional.redditClone.member.members.sessions.at(
    memberConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 4. Verify session metadata
  // Session ID should be a valid UUID format
  TestValidator.predicate(
    "session ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  // Verify timestamps exist and are valid
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.updated_at),
  );
  // 5. Verify email and username are included in response
  TestValidator.equals(
    "email matches authenticated user",
    session.email,
    authorized.email,
  );
  TestValidator.equals(
    "username matches authenticated user",
    session.username,
    authorized.username,
  );
  // 6. Verify profile is included
  TestValidator.predicate(
    "profile exists",
    session.profile !== null && session.profile !== undefined,
  );
  TestValidator.equals(
    "profile display_name exists",
    session.profile.display_name !== undefined,
    true,
  );
  // 7. Verify karma is included
  TestValidator.predicate(
    "karma exists",
    session.karma !== null && session.karma !== undefined,
  );
}
