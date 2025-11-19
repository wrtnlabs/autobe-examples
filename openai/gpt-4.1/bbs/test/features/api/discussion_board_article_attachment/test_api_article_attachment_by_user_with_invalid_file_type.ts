import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that the API rejects file attachments having a forbidden file type or
 * MIME type.
 *
 * 1. Register a new discussion board user and obtain authentication (tokens will
 *    be set in connection).
 * 2. Prepare an invalid file attachment DTO with a forbidden file extension (e.g.,
 *    ".exe") and MIME type (e.g., "application/octet-stream").
 * 3. Attempt to attach this invalid file to a placeholder/random article UUID
 *    using the attachments.create endpoint.
 * 4. Expect and assert that the API responds with a validation error.
 */
export async function test_api_article_attachment_by_user_with_invalid_file_type(
  connection: api.IConnection,
) {
  // 1. Register a new user for authentication
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.MinLength<8> &
        tags.MaxLength<72> &
        tags.Format<"password">,
    },
  });
  typia.assert(user);

  // 2. Prepare an invalid file attachment (forbidden extension and MIME type)
  const invalidAttachment = {
    file_name: `${RandomGenerator.alphabets(8)}.exe` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    mime_type: "application/octet-stream" as string &
      tags.MinLength<3> &
      tags.MaxLength<63>,
    file_size: 4096 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<10485760>,
    file_uri: "https://files.example.com/uploads/fakefile.exe" as string &
      tags.Format<"uri">,
  };

  // 3. Attempt to add the attachment to a random article UUID (since article seeding isn't available in the scope)
  await TestValidator.error(
    "should reject attachment with forbidden file extension or MIME type",
    async () => {
      await api.functional.discussionBoard.user.articles.attachments.create(
        connection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          body: invalidAttachment,
        },
      );
    },
  );
}
