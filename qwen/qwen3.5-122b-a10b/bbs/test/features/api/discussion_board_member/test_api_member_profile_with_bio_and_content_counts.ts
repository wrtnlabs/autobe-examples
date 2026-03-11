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
 * Test that member profile correctly displays bio text and computed content statistics.
 * Create a member account with both display name and bio text provided during registration.
 * Verify the profile response includes the bio field with the provided text, and that
 * article_count and comment_count fields accurately reflect the member's content activity.
 * This scenario validates that profile information is properly persisted and that content
 * aggregation logic correctly computes statistics from related articles and comments tables.
 */
export async function test_api_member_profile_with_bio_and_content_counts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with bio information
  const memberConnection: api.IConnection = { host: connection.host };
  const bioText = RandomGenerator.paragraph({ sentences: 5 });
  const displayName = RandomGenerator.name();
  const email = `${RandomGenerator.name().toLowerCase().replace(/\s+/g, ".")}@example.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const href = `/${RandomGenerator.alphaNumeric(10)}`;
  const referrer = `/${RandomGenerator.alphaNumeric(8)}`;
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      displayName,
      bio: bioText,
      href,
      referrer,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Retrieve member profile
  const profile =
    await api.functional.discussionBoard.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate bio is correctly persisted
  TestValidator.equals("bio matches input", profile.bio, bioText);
  TestValidator.equals(
    "display name matches input",
    profile.display_name,
    displayName,
  );
  // 4. Validate content counts are zero for new member
  TestValidator.equals("article count is zero", profile.article_count, 0);
  TestValidator.equals("comment count is zero", profile.comment_count, 0);
}
