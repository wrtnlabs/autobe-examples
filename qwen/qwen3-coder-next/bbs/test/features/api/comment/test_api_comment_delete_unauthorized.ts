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

export async function test_api_comment_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A - Auth and create article and comment
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Create article as member A
  const articleRaw =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberAConnection,
      {
        sectionId: "test-section-id",
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  const article = typia.assert<IDiscussionBoardArticle & { id: string }>(articleRaw);
  // Create comment on article as member A
  const commentRaw = await api.functional.discussionBoard.member.comments.create(
    memberAConnection,
    {
      body: typia.random<IDiscussionBoardArticleComment.ICreate>(),
    },
  );
  const comment = typia.assert<IDiscussionBoardArticleComment & { id: string }>(commentRaw);
  // 2. Member B - Auth and attempt unauthorized deletion
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 3. Attempt to delete member A's comment as member B (should fail)
  await TestValidator.error("unauthorized comment deletion", async () => {
    await api.functional.discussionBoard.member.articles.comments.erase(
      memberBConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  });
}