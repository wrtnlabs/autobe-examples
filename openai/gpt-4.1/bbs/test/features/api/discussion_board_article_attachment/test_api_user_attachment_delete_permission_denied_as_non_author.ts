import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validates that a non-author user cannot delete another user's article
 * attachment.
 *
 * Scenario:
 *
 * 1. Register userA.
 * 2. UserA uploads an attachment to a randomly generated article.
 * 3. Register userB.
 * 4. UserB (not the author) attempts to delete userA's attachment.
 *
 * Steps:
 *
 * - UserA and userB are both registered using auth.user.join (which sets
 *   Authorization token in SDK).
 * - UserA creates an attachment by calling attachments.create for a random
 *   articleId.
 * - UserB attempts to erase the attachment; permission is denied
 *   (TestValidator.error expected).
 * - Due to missing attachment/article list/read, only the error is asserted
 *   (cannot verify that the attachment still exists, but trusts the backend
 *   mechanics).
 */
export async function test_api_user_attachment_delete_permission_denied_as_non_author(
  connection: api.IConnection,
) {
  // Register userA
  const userA_email: string = typia.random<string & tags.Format<"email">>();
  const userA_password: string = "PasswordA1";
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userA_email,
      password: userA_password as string &
        tags.MinLength<8> &
        tags.MaxLength<72> &
        tags.Format<"password">,
    },
  });
  typia.assert(userA);

  // userA creates (random) article and uploads attachment
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const attachmentBody = {
    file_name: RandomGenerator.name() + ".png",
    mime_type: "image/png" as string & tags.MinLength<3> & tags.MaxLength<63>,
    file_size: 1024 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<10485760>,
    file_uri: ("https://cdn.example.com/attach/" +
      RandomGenerator.alphaNumeric(12)) as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const attachment =
    await api.functional.discussionBoard.user.articles.attachments.create(
      connection,
      {
        articleId,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // Register userB (non-author, new account)
  const userB_email: string = typia.random<string & tags.Format<"email">>();
  const userB_password: string = "PasswordB2";
  await api.functional.auth.user.join(connection, {
    body: {
      email: userB_email,
      password: userB_password as string &
        tags.MinLength<8> &
        tags.MaxLength<72> &
        tags.Format<"password">,
    },
  });
  // SDK sets Authorization header to userB's token

  // Try to delete (erase) attachment as userB (not the author)
  await TestValidator.error(
    "non-author user cannot delete another user's attachment",
    async () => {
      await api.functional.discussionBoard.user.articles.attachments.erase(
        connection,
        {
          articleId,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
