import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import type { IEconPolDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAttachment";
import type { IEconPolDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardComment";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function test_api_econ_pol_discussion_board_comment_deletion_by_member(
  connection: api.IConnection,
) {
  // 1. Member self-registration and obtain authorization token
  const joinBody = {
    username: RandomGenerator.name(1),
    password: "P@ssword1234",
    email: `${RandomGenerator.name(1)}@example.com`,
  } satisfies IEconPolDiscussionBoardMember.ICreate;

  const authMember: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authMember);

  // 2. Create article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 7 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconPolDiscussionBoardArticle.ICreate;

  const article: IEconPolDiscussionBoardArticle =
    await api.functional.econPolDiscussionBoard.member.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 3. Generate a random comment ID which we will attempt to delete
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt to delete a non-existent comment to test error handling
  await TestValidator.error(
    "deleting non-existent comment should error",
    async () => {
      await api.functional.econPolDiscussionBoard.member.econPolDiscussionBoard.comments.erase(
        connection,
        {
          commentId: randomCommentId,
        },
      );
    },
  );

  // 5. Attempt to delete the same comment ID again to confirm error handling
  await TestValidator.error("deleting comment twice should error", async () => {
    await api.functional.econPolDiscussionBoard.member.econPolDiscussionBoard.comments.erase(
      connection,
      {
        commentId: randomCommentId,
      },
    );
  });
}
