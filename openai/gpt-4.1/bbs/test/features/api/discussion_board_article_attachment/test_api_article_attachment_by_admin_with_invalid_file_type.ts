import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that an administrator cannot attach forbidden file types or MIME
 * types to an article.
 *
 * Scenario:
 *
 * 1. Register a user and an admin account.
 * 2. (Preparation) Create an article as the user (simulate via random UUID, since
 *    only attachment API is available).
 * 3. As admin, attempt to attach a .exe file (forbidden extension) or with MIME
 *    type 'application/x-msdownload'.
 * 4. Verify server rejects with validation error (business logic) – error must be
 *    thrown.
 */
export async function test_api_article_attachment_by_admin_with_invalid_file_type(
  connection: api.IConnection,
) {
  // 1. Register a user (the article owner)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12);
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword as string &
          tags.MinLength<8> &
          tags.MaxLength<72> &
          tags.Format<"password">,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);

  // 2. Register an admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        href: "https://admin-join.example.com/", // Required URI for registration context
        referrer: "https://referrer.example.com/", // Required URI for audit
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 3. Prepare: create random article ID (simulated)
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Attempt to attach forbidden file as admin: .exe extension and invalid MIME
  const forbiddenFileName = RandomGenerator.alphaNumeric(8) + ".exe"; // .exe extension
  const forbiddenMimeType = "application/x-msdownload"; // Known forbidden
  const fileSize: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<10485760> = 1024 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<10485760>;
  const fileUri: string & tags.Format<"uri"> =
    "https://storage.example.com/invalid.exe" as string & tags.Format<"uri">;

  await TestValidator.error(
    "admin cannot attach forbidden file types or MIME",
    async () => {
      await api.functional.discussionBoard.admin.articles.attachments.create(
        connection,
        {
          articleId,
          body: {
            file_name: forbiddenFileName as string &
              tags.MinLength<1> &
              tags.MaxLength<255>,
            mime_type: forbiddenMimeType as string &
              tags.MinLength<3> &
              tags.MaxLength<63>,
            file_size: fileSize,
            file_uri: fileUri,
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    },
  );
}
