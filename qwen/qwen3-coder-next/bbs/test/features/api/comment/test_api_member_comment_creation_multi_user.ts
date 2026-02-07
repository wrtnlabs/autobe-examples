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

/**
 * Test multi-user comment creation workflow.
 * Validates that multiple users can create comments on the same article.
 * Since the comment DTO has no properties and article/list APIs are unavailable,
 * this test focuses on basic comment creation success for different users.
 */
export async function test_api_member_comment_creation_multi_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First member registers
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Step 2: Second member registers
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Step 3: Member2 creates a comment
  const comment1 = await api.functional.discussionBoard.member.comments.create(
    member2Connection,
    {
      body: typia.random<IDiscussionBoardArticleComment.ICreate>(),
    },
  );
  typia.assert(comment1);
  // Step 4: Member1 creates another comment
  const comment2 = await api.functional.discussionBoard.member.comments.create(
    member1Connection,
    {
      body: typia.random<IDiscussionBoardArticleComment.ICreate>(),
    },
  );
  typia.assert(comment2);
  // Validate both comments were created successfully
  TestValidator.predicate(
    "both comments created successfully",
    comment1 !== null && comment2 !== null,
  );
}
