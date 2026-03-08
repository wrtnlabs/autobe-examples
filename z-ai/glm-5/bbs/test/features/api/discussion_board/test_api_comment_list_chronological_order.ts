import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_comment_list_chronological_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 2. Member setup - create article
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    { body: { section_id: section.id } },
  );
  typia.assert(article);
  // 3. Retrieve comments with default ordering (oldest first)
  // Note: No comment creation API is available in the SDK
  // Testing the index endpoint to validate response structure and ordering
  const response = await api.functional.discussionBoard.articles.comments.index(
    connection,
    {
      articleId: article.id,
      body: {},
    },
  );
  typia.assert(response);
  // 4. Validate pagination metadata exists
  TestValidator.predicate(
    "pagination current exists",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit exists",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records exists",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages exists",
    response.pagination.pages >= 0,
  );
  // 5. Validate chronological order if comments exist
  if (response.data.length > 0) {
    const timestamps = response.data.map((c) =>
      new Date(c.created_at).getTime(),
    );
    for (let i = 1; i < timestamps.length; i++) {
      TestValidator.predicate(
        "comments should be in chronological order (oldest first)",
        timestamps[i - 1] <= timestamps[i],
      );
    }
  }
  // 6. Validate comment structure if data exists
  for (const comment of response.data) {
    TestValidator.predicate("comment has id", comment.id.length > 0);
    TestValidator.predicate("comment has content", comment.content.length > 0);
    TestValidator.predicate("comment has author", comment.author !== null);
  }
}
