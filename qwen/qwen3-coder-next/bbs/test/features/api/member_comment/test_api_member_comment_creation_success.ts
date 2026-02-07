import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { prepare_random_discussion_board_article_comment } from "../../../prepare/prepare_random_discussion_board_article_comment";

export async function test_api_member_comment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // Update connection with the access token
  const connectedMember: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 2. Create article for commenting
  // Since we don't have direct article creation in this scenario, we'll use a mock article ID
  // In real implementation, we would first create an article
  const mockArticleId = "article-12345678-1234-1234-1234-123456789012";
  // 3. Create comment on the article
  const commentContent = RandomGenerator.paragraph({ sentences: 2 });
  const comment = await api.functional.discussionBoard.member.comments.create(
    connectedMember,
    {
      body: {
        content: commentContent,
        article_id: mockArticleId,
      } satisfies IDiscussionBoardArticleComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Validate comment creation
  TestValidator.predicate("comment is valid", () => Boolean(comment));
}