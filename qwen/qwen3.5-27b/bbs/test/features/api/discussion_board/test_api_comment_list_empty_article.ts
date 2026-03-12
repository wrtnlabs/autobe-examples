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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that the comments endpoint returns an empty paginated result when an article has no comments.
 *
 * Setup:
 * 1. Administrator joins and logs in
 * 2. Member joins and logs in
 * 3. Administrator creates a section
 * 4. Member creates an article in that section (without any comments)
 *
 * Test Steps:
 * 1. Call the comments listing endpoint with the articleId of an article with no comments
 * 2. Verify the response returns a valid paginated structure
 * 3. Verify the data array is empty
 * 4. Verify pagination shows: records = 0, pages = 0, current = 1
 * 5. Verify no error is thrown (this is a valid state, not an error condition)
 */
export async function test_api_comment_list_empty_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 4. Create an article without any comments
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(article);
  // 5. Call the comments listing endpoint for the article with no comments
  const comments = await api.functional.discussionBoard.articles.comments.index(
    memberConnection,
    {
      articleId: article.id,
      body: {},
    },
  );
  typia.assert(comments);
  // 6. Verify the response structure
  TestValidator.equals("data array is empty", comments.data.length, 0);
  TestValidator.equals("records count is 0", comments.pagination.records, 0);
  TestValidator.equals("pages count is 0", comments.pagination.pages, 0);
  TestValidator.equals("current page is 1", comments.pagination.current, 1);
}
