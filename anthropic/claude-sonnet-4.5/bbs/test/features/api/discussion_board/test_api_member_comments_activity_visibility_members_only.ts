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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test authenticated member comment retrieval functionality.
 *
 * This test validates that authenticated members can successfully retrieve
 * comments posted by other members. The test creates the necessary
 * infrastructure (category, article), registers a member account, posts
 * multiple comments, and verifies that the comments can be retrieved through
 * the member comments endpoint.
 *
 * Note: The original scenario requested testing "members_only" activity
 * visibility, but the API does not provide a way to set activity_visibility
 * during registration (it's a response-only field). Therefore, this test
 * focuses on the core functionality of authenticated comment retrieval.
 *
 * Test workflow:
 *
 * 1. Create moderator account for category management
 * 2. Create discussion board category
 * 3. Register member account
 * 4. Create article for comment posting
 * 5. Post multiple comments as the member
 * 6. Retrieve comment list as authenticated member
 * 7. Validate comments are accessible and properly structured
 */
export async function test_api_member_comments_activity_visibility_members_only(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to manage categories
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(moderator);

  // Step 2: Create a discussion board category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Test Category ${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Register member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 4: Create an article for posting comments
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
        tag_ids: [],
        image_ids: [],
        document_ids: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Post multiple comments as the member
  const commentCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >();
  const postedComments = await ArrayUtil.asyncRepeat(commentCount, async () => {
    const comment =
      await api.functional.discussionBoard.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            discussion_board_article_id: article.id,
            discussion_board_parent_comment_id: null,
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    return comment;
  });

  // Step 6: Retrieve comment list as authenticated member
  const commentsPage =
    await api.functional.discussionBoard.members.comments.index(connection, {
      memberUsername: memberUsername,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(commentsPage);

  // Step 7: Validate comments are accessible and properly structured
  TestValidator.predicate(
    "comments should be retrieved successfully",
    commentsPage.data.length > 0,
  );

  TestValidator.predicate(
    "retrieved comment count should match posted count",
    commentsPage.data.length === postedComments.length,
  );

  TestValidator.equals(
    "pagination total records should match comment count",
    commentsPage.pagination.records,
    postedComments.length,
  );

  // Verify each comment belongs to the member
  commentsPage.data.forEach((commentSummary) => {
    TestValidator.equals(
      "comment author type should be member",
      commentSummary.author_type,
      "member",
    );

    TestValidator.predicate(
      "comment should have member author",
      commentSummary.memberAuthor !== null,
    );

    if (commentSummary.memberAuthor) {
      TestValidator.equals(
        "comment author username should match member",
        commentSummary.memberAuthor.username,
        memberUsername,
      );
    }
  });
}
