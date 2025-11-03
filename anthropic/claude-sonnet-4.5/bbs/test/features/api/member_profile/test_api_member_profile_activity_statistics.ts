import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that member profile retrieval includes accurate activity statistics.
 *
 * This test validates that when retrieving a member's profile by username, the
 * response includes accurate activity statistics such as article count and
 * comment count that match the actual number of articles and comments created
 * by the member.
 *
 * Test workflow:
 *
 * 1. Create moderator account for category management
 * 2. Authenticate as moderator
 * 3. Create required category for article creation
 * 4. Create member account whose activity will be tracked
 * 5. Authenticate as member
 * 6. Create multiple articles (3 articles)
 * 7. Create multiple comments on those articles (5 comments)
 * 8. Retrieve member profile by username
 * 9. Validate article count matches created articles (3)
 * 10. Validate comment count matches created comments (5)
 */
export async function test_api_member_profile_activity_statistics(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // Step 2: Create category (required for articles)
  const categoryBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberBody = {
    username: memberUsername,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // Step 4: Create multiple articles (3 articles)
  const articleCount = 3;
  const createdArticles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < articleCount; i++) {
    const articleBody = {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 3 }),
      category_ids: [category.id],
    } satisfies IDiscussionBoardArticle.ICreate;

    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.member.articles.create(connection, {
        body: articleBody,
      });
    typia.assert(article);
    createdArticles.push(article);
  }

  // Step 5: Create multiple comments (5 comments total across articles)
  const commentCount = 5;
  const createdComments: IDiscussionBoardComment[] = [];

  for (let i = 0; i < commentCount; i++) {
    const targetArticle = createdArticles[i % createdArticles.length];

    const commentBody = {
      discussion_board_article_id: targetArticle.id,
      content: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IDiscussionBoardComment.ICreate;

    const comment: IDiscussionBoardComment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        {
          articleId: targetArticle.id,
          body: commentBody,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // Step 6: Retrieve member profile
  const memberProfile: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.at(connection, {
      memberUsername: memberUsername,
    });
  typia.assert(memberProfile);

  // Step 7: Validate profile identity
  TestValidator.equals(
    "member profile username matches",
    memberProfile.username,
    memberUsername,
  );

  TestValidator.equals(
    "member profile ID matches",
    memberProfile.id,
    member.id,
  );
}
