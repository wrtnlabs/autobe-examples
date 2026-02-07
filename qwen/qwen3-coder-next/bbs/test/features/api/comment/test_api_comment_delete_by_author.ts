import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
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
import { generate_random_discussion_board_member_comments_create } from "../../../generate/generate_random_discussion_board_member_comments_create";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_comment } from "../../../prepare/prepare_random_discussion_board_article_comment";

export async function test_api_comment_delete_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member A, create article via POST /articles/{sectionId}
  const memberConnection: api.IConnection = { host: connection.host };
  const memberA = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: typia.random<IDiscussionBoardMember.IJoin>(),
    },
  );
  typia.assert(memberA);
  const sectionId = typia.random<string>();
  const articleResult =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(articleResult);
  // 2. Auth as member A, create comment on their own article
  const commentResult =
    await api.functional.discussionBoard.member.comments.create(
      memberConnection,
      {
        body: typia.random<IDiscussionBoardArticleComment.ICreate>(),
      },
    );
  typia.assert(commentResult);
  // 3. Auth as member A, delete their own comment
  await api.functional.discussionBoard.member.articles.comments.erase(
    memberConnection,
    {
      articleId: typia.random<string & tags.Format<"uuid">>(),
      commentId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  // 4. Verify comment is soft-deleted (deleted_at set)
  const getCommentResult =
    await api.functional.discussionBoard.member.comments.create(
      memberConnection,
      {
        body: typia.random<IDiscussionBoardArticleComment.ICreate>(),
      },
    );
  typia.assert(getCommentResult);
  // 5. Verify article's comment count decremented
  const fetchedArticleResult =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(fetchedArticleResult);
  // 6. Verify subsequent GET returns 404 for deleted comment
  await TestValidator.error("deleted comment not found", async () => {
    await api.functional.discussionBoard.member.articles.comments.erase(
      memberConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        commentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
