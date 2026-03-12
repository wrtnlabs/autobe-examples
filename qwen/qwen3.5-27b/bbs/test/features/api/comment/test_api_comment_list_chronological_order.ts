import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that comments are retrieved and displayed in chronological order (oldest first) for an article with multiple comments.
 *
 * Setup:
 * 1. Create administrator account and authenticate
 * 2. Create member account and authenticate
 * 3. Create a section via administrator
 * 4. Create an article in that section via member
 * 5. Create 3-5 comments on the article with small delays to ensure different timestamps
 *
 * Test Steps:
 * 1. Call the comments listing endpoint with the articleId
 * 2. Verify the response contains all active comments (not soft-deleted)
 * 3. Verify comments are ordered by created_at in ascending order (oldest first)
 * 4. Verify each comment includes: id, content, author (with display_name), and created_at
 * 5. Verify pagination metadata is correct (current page, total records, total pages)
 */
export async function test_api_comment_list_chronological_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      display_name: "Test Admin",
    },
  });
  // 2. Create a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      display_name: "Test Member",
    },
  });
  // 4. Create an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 5. Create multiple comments with small delays to ensure different timestamps
  const comments: IDiscussionBoardComment[] = [];
  const commentCount = 5;
  for (let i = 0; i < commentCount; i++) {
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
    const comment =
      await generate_random_discussion_board_member_articles_comments_create(
        memberConnection,
        {
          params: {
            articleId: article.id,
          },
          body: {
            content: `Test comment number ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 6. Retrieve comments list
  const commentList =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          pageSize: 20,
          sortBy: "createdAt",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(commentList);
  // 7. Verify pagination metadata
  TestValidator.equals(
    "total records matches comment count",
    commentList.pagination.records,
    commentCount,
  );
  TestValidator.equals("current page is 1", commentList.pagination.current, 1);
  TestValidator.equals("limit is 20", commentList.pagination.limit, 20);
  TestValidator.equals("total pages is 1", commentList.pagination.pages, 1);
  TestValidator.equals(
    "data array length matches records",
    commentList.data.length,
    commentCount,
  );
  // 8. Verify chronological order (oldest first)
  for (let i = 0; i < commentList.data.length - 1; i++) {
    const currentComment = commentList.data[i];
    const nextComment = commentList.data[i + 1];
    TestValidator.predicate(
      `comment ${i + 1} created_at is before or equal to comment ${i + 2} created_at`,
      new Date(currentComment.created_at).getTime() <=
        new Date(nextComment.created_at).getTime(),
    );
  }
  // 9. Verify each comment has required fields
  for (let i = 0; i < commentList.data.length; i++) {
    const comment = commentList.data[i];
    // Verify id exists and is UUID format (already validated by typia.assert)
    TestValidator.predicate(
      `comment ${i + 1} has valid id`,
      comment.id.length > 0,
    );
    // Verify content exists and is not empty
    TestValidator.predicate(
      `comment ${i + 1} has non-empty content`,
      comment.content.length > 0,
    );
    // Verify author information
    TestValidator.predicate(
      `comment ${i + 1} has author id`,
      comment.author.id.length > 0,
    );
    TestValidator.predicate(
      `comment ${i + 1} has author email`,
      comment.author.email.length > 0,
    );
    // Verify created_at exists and is valid date-time
    TestValidator.predicate(
      `comment ${i + 1} has valid created_at`,
      !isNaN(Date.parse(comment.created_at)),
    );
  }
  // 10. Verify comments are in the same order as created (first created should be first in list)
  const firstCreatedComment = comments[0];
  const lastCreatedComment = comments[comments.length - 1];
  TestValidator.equals(
    "first comment in list is the oldest",
    commentList.data[0].id,
    firstCreatedComment.id,
  );
  TestValidator.equals(
    "last comment in list is the newest",
    commentList.data[commentList.data.length - 1].id,
    lastCreatedComment.id,
  );
}
