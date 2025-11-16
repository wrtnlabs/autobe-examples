import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberPreference";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate that member preferences are correctly associated with the
 * authenticated member.
 *
 * This test ensures that when retrieving member preferences, the returned
 * preference record's member_id matches the authenticated member's ID. This
 * validates data isolation between members and prevents preferences from being
 * mixed across different accounts.
 *
 * Test flow:
 *
 * 1. Setup: Create moderator and category for article creation
 * 2. Register first member and create an article to establish active member status
 * 3. Retrieve preferences for first member and validate member_id association
 * 4. Register second member and create an article
 * 5. Retrieve preferences for second member and validate member_id association
 * 6. Verify preferences are isolated (different member_ids for different members)
 */
export async function test_api_member_preferences_member_id_association(
  connection: api.IConnection,
) {
  // Step 1: Create moderator and category for article support
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: `moderator-${RandomGenerator.alphaNumeric(8)}@example.com`,
        username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Category-${RandomGenerator.alphaNumeric(6)}`,
          slug: `category-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Register first member and create article
  const member1Email = `member1-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: `member1_${RandomGenerator.alphaNumeric(8)}`,
        display_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  const article1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: `Article-${RandomGenerator.alphaNumeric(6)}`,
        body: RandomGenerator.paragraph({ sentences: 10 }),
        category_id: category.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article1);

  // Step 3: Retrieve preferences for first member and validate association
  const preferences1: IDiscussionBoardMemberPreference =
    await api.functional.discussionBoard.member.memberPreferences.at(
      connection,
      {
        memberId: member1.id,
      },
    );
  typia.assert(preferences1);

  TestValidator.equals(
    "first member preferences member_id matches authenticated member",
    preferences1.member_id,
    member1.id,
  );

  // Step 4: Register second member and create article
  const member2Email = `member2-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: `member2_${RandomGenerator.alphaNumeric(8)}`,
        display_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  const article2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: `Article-${RandomGenerator.alphaNumeric(6)}`,
        body: RandomGenerator.paragraph({ sentences: 10 }),
        category_id: category.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article2);

  // Step 5: Retrieve preferences for second member and validate association
  const preferences2: IDiscussionBoardMemberPreference =
    await api.functional.discussionBoard.member.memberPreferences.at(
      connection,
      {
        memberId: member2.id,
      },
    );
  typia.assert(preferences2);

  TestValidator.equals(
    "second member preferences member_id matches authenticated member",
    preferences2.member_id,
    member2.id,
  );

  // Step 6: Verify data isolation - preferences should not be mixed
  TestValidator.notEquals(
    "member preferences are isolated between different members",
    preferences1.member_id,
    preferences2.member_id,
  );

  TestValidator.equals(
    "first member preferences member_id is not second member's id",
    preferences1.member_id === member2.id,
    false,
  );

  TestValidator.equals(
    "second member preferences member_id is not first member's id",
    preferences2.member_id === member1.id,
    false,
  );
}
