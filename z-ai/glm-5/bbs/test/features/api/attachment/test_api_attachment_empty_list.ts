import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";

/**
 * Test that an article with no attachments returns an empty paginated result.
 *
 * This test verifies that the attachment list endpoint correctly handles
 * articles without any attachments by returning an empty data array with
 * appropriate pagination metadata (records: 0, pages: 0).
 */
export async function test_api_attachment_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an article without attachments
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        // Do not include attachments - create article without them
        attachments: undefined,
      },
    },
  );
  typia.assert(article);
  // 3. Call the attachment list endpoint for the article
  const attachmentList =
    await api.functional.discussionBoard.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(attachmentList);
  // 4. Verify response contains empty data array
  TestValidator.equals("data is empty array", attachmentList.data, []);
  // 5. Verify pagination metadata shows records: 0 and pages: 0
  TestValidator.equals("records is 0", attachmentList.pagination.records, 0);
  TestValidator.equals("pages is 0", attachmentList.pagination.pages, 0);
  // 6. Verify current page is 1 and limit matches request (default 20)
  TestValidator.equals(
    "current page is 1",
    attachmentList.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is default 20",
    attachmentList.pagination.limit,
    20,
  );
  // 7. Response structure validation already done by typia.assert
}
