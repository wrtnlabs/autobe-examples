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
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_comment_retrieval_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user via join
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: typia.random<IDiscussionBoardMember.IJoin>(),
    },
  );
  typia.assert(joinOutput);
  // 2. Retrieve comment using available API with random IDs
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();
  const retrievedComment =
    await api.functional.discussionBoard.member.articles.comments.at(
      memberConnection,
      {
        articleId: randomArticleId,
        commentId: randomCommentId,
      },
    );
  typia.assert(retrievedComment);
  // Since IDiscussionBoardArticleComment is an empty type with no properties,
  // we can only verify the retrieval was successful
  TestValidator.predicate(
    "retrieved comment exists",
    retrievedComment !== null,
  );
}
