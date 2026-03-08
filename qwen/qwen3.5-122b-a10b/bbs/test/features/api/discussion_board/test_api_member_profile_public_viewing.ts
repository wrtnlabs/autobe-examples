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
 * Test that any user (guest or authenticated member) can view another member's public profile.
 * The endpoint should return the member's display name, bio text, article count, comment count, and timestamps.
 * Sensitive information (email, password hash, ban status, ban reason) must be excluded from the response.
 * The test should verify that the response contains all required public fields and that article/comment counts are correctly aggregated from the database.
 */
export async function test_api_member_profile_public_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a test member whose profile will be viewed
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. View the member's public profile (as a guest - no authentication needed)
  const profile = await api.functional.discussionBoard.members.at(
    { host: connection.host },
    { memberId: memberAuth.id },
  );
  typia.assert(profile);
  // 3. Validate that the response contains all required public fields
  TestValidator.equals("member ID matches", profile.id, memberAuth.id);
  TestValidator.equals(
    "display name matches",
    profile.displayName,
    memberAuth.displayName,
  );
  TestValidator.equals("bio matches", profile.bio, memberAuth.bio ?? null);
  TestValidator.predicate(
    "article count is non-negative",
    profile.articleCount >= 0,
  );
  TestValidator.predicate(
    "comment count is non-negative",
    profile.commentCount >= 0,
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    profile.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    profile.updatedAt.length > 0,
  );
  // 4. Verify deletedAt is null for active member
  TestValidator.equals(
    "deletedAt is null for active member",
    profile.deletedAt,
    null,
  );
  // 5. Verify sensitive fields are NOT in the response by type checking
  // ISummary type ensures email, banStatus, and banReason are excluded
  // We verify the response structure matches ISummary through typia.assert()
  const summaryKeys: Array<keyof IDiscussionBoardMember.ISummary> = [
    "id",
    "displayName",
    "bio",
    "articleCount",
    "commentCount",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ];
  TestValidator.equals(
    "response has expected public fields count",
    Object.keys(profile).length,
    summaryKeys.length,
  );
}
