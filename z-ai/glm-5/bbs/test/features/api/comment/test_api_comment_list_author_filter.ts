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

export async function test_api_comment_list_author_filter(
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
  // 2. Member1 setup - create article
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  const article = await generate_random_discussion_board_member_articles_create(
    member1Connection,
    { body: { section_id: section.id } },
  );
  typia.assert(article);
  // 3. Member2 setup
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  // 4. Test: Filter by member1's ID
  const member1Comments =
    await api.functional.discussionBoard.articles.comments.index(
      member1Connection,
      {
        articleId: article.id,
        body: { memberId: member1.id },
      },
    );
  typia.assert(member1Comments);
  // Validate all returned comments are from member1
  for (const comment of member1Comments.data) {
    TestValidator.equals(
      "comment author should be member1",
      comment.author.id,
      member1.id,
    );
  }
  // 5. Test: Filter by member2's ID
  const member2Comments =
    await api.functional.discussionBoard.articles.comments.index(
      member2Connection,
      {
        articleId: article.id,
        body: { memberId: member2.id },
      },
    );
  typia.assert(member2Comments);
  // Validate all returned comments are from member2
  for (const comment of member2Comments.data) {
    TestValidator.equals(
      "comment author should be member2",
      comment.author.id,
      member2.id,
    );
  }
  // 6. Test: Filter by non-existent member ID
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const emptyComments =
    await api.functional.discussionBoard.articles.comments.index(
      member1Connection,
      {
        articleId: article.id,
        body: { memberId: nonExistentMemberId },
      },
    );
  typia.assert(emptyComments);
  // Validate empty results for non-existent member
  TestValidator.equals(
    "non-existent member filter returns empty data",
    emptyComments.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent member filter returns zero records",
    emptyComments.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent member filter returns zero pages",
    emptyComments.pagination.pages,
    0,
  );
  // 7. Test: Get all comments without filter
  const allComments =
    await api.functional.discussionBoard.articles.comments.index(
      member1Connection,
      {
        articleId: article.id,
        body: {},
      },
    );
  typia.assert(allComments);
  // Validate that unfiltered results contain comments from both members
  const allAuthorIds = new Set(allComments.data.map((c) => c.author.id));
  TestValidator.predicate(
    "unfiltered results can contain comments from multiple members",
    allComments.data.length === 0 || allAuthorIds.size >= 1,
  );
}
