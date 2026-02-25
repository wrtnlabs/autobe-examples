import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_member_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // Step 1: Member A registers and logs in
  const memberA = await api.functional.discussionBoard.auth.member.join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        passwordConfirmation: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberA);
  // Update connection with member A's token
  memberAConnection.headers = { Authorization: memberA.token.access };
  // Step 2: Member A creates a comment using available SDK function
  // Note: Comment creation requires article ID - using placeholder UUID
  // In real scenario, article would be created first by a different endpoint
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberAConnection,
      {
        articleId: articleId,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 3: Member B registers and logs in
  const memberB = await api.functional.discussionBoard.auth.member.join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        passwordConfirmation: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberB);
  // Update connection with member B's token
  memberBConnection.headers = { Authorization: memberB.token.access };
  // Step 4: Member B attempts to update member A's comment (should fail with 403)
  await TestValidator.httpError(
    "member B cannot update member A's comment",
    403,
    async () => {
      await api.functional.discussionBoard.member.comments.update(
        memberBConnection,
        {
          commentId: comment.id,
          body: {
            content: "Updated by unauthorized member",
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
}
