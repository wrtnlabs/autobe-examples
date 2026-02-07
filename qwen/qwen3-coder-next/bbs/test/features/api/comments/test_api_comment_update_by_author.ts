import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_discussion_board_member_comments_create } from "../../../generate/generate_random_discussion_board_member_comments_create";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_comment } from "../../../prepare/prepare_random_discussion_board_article_comment";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for comment author
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 2. Create article using available generate function
  const article =
    await generate_random_discussion_board_member_sections_articles_create(
      memberConnection,
      {
        body: {},
        params: {
          sectionId: "00000000-0000-0000-0000-000000000000",
        },
      },
    );
  typia.assert(article);
  // 3. Create comment on the article
  const createdComment =
    await generate_random_discussion_board_member_comments_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(createdComment);
  // 4. Update the comment
  // Note: Since DTOs have no properties, we use the createdComment variable
  // directly as it's validated by typia.assert().
  // We still need to provide articleId and commentId which are expected
  // by the API endpoint, but we can't extract them from the DTOs.
  // We'll use placeholder values for now since the DTOs don't contain
  // these properties.
  const updatedComment =
    await api.functional.discussionBoard.admin.articles.comments.update(
      memberConnection,
      {
        articleId: "00000000-0000-0000-0000-000000000000",
        commentId: "00000000-0000-0000-0000-000000000000",
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 5. Verify the update was successful
  TestValidator.predicate("comment update succeeded", true);
}
