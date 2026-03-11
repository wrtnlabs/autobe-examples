import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a registered member can successfully retrieve their own profile information.
 * After joining the system, the member should be able to access their complete profile
 * including display name, bio status, ban status, and account timestamps. The response
 * must include article and comment counts computed from their content. Sensitive
 * authentication fields (email, password_hash) must be excluded from the response.
 * This validates the primary success path for profile viewing functionality.
 */
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create member-specific connection for profile retrieval
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authResult.token.access },
  };
  // 3. Retrieve member profile
  const profile =
    await api.functional.discussionBoard.member.profile.at(memberConnection);
  typia.assert(profile);
  // 4. Validate profile structure and content
  TestValidator.equals("member ID matches", profile.id, authResult.id);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    authResult.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, authResult.bio);
  TestValidator.equals("ban status is active", profile.ban_status, "active");
  TestValidator.equals(
    "created_at matches",
    profile.created_at,
    authResult.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    profile.updated_at,
    authResult.updated_at,
  );
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
  TestValidator.equals("article count is zero", profile.article_count, 0);
  TestValidator.equals("comment count is zero", profile.comment_count, 0);
  // 5. Verify sensitive fields are NOT exposed in profile response
  // Email should not be present in IDiscussionBoardMember (only in IAuthorized)
  TestValidator.predicate("email not exposed", !("email" in profile));
  TestValidator.predicate(
    "password_hash not exposed",
    !("password_hash" in profile),
  );
}
