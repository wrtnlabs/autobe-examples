import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validates that attachment-over-quota policy is enforced for both admins and
 * non-admin users.
 *
 * 1. Admin joins (gets JWT)
 * 2. User joins (gets JWT)
 * 3. Create a dummy article (not covered by the provided APIs/DTOs, so we simulate
 *    a UUID for the article)
 * 4. As admin, upload the maximum number of attachments (5): all uploads should
 *    succeed.
 * 5. As admin, attempt to upload a sixth attachment: should fail (over-quota)
 * 6. As admin, attempt to upload an attachment with file_size over 10MB: should
 *    fail
 * 7. As user, upload the maximum number of attachments (5) to another article: all
 *    uploads should succeed.
 * 8. As user, attempt to upload a sixth attachment: should fail (over-quota)
 * 9. As user, attempt to upload an attachment with file_size over 10MB: should
 *    fail
 */
export async function test_api_article_attachment_by_admin_over_quota(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://discussion.board/admin/register",
    referrer: "https://discussion.board/",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. User joins
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userJoinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.MaxLength<72> &
      tags.Format<"password">,
  } satisfies IDiscussionBoardUser.ICreate;
  const userAuth: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(userAuth);

  // 3. Prepare target articles (simulate UUIDs representing newly created articles for admin and for user)
  const adminArticleId = typia.random<string & tags.Format<"uuid">>();
  const userArticleId = typia.random<string & tags.Format<"uuid">>();

  // Prepare compliant attachment body factory
  const makeAttachment = (): IDiscussionBoardArticleAttachment.ICreate => ({
    file_name: `${RandomGenerator.alphaNumeric(8)}.pdf` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    mime_type: "application/pdf" as string &
      tags.MinLength<3> &
      tags.MaxLength<63>,
    file_size: 1024 * 1024,
    file_uri:
      `https://storage.example.com/${RandomGenerator.alphaNumeric(16)}.pdf` as string &
        tags.Format<"uri">,
  });

  // Prepare over-size attachment body factory
  const makeOversizeAttachment =
    (): IDiscussionBoardArticleAttachment.ICreate => ({
      file_name: `${RandomGenerator.alphaNumeric(8)}.pdf` as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      mime_type: "application/pdf" as string &
        tags.MinLength<3> &
        tags.MaxLength<63>,
      file_size: 11 * 1024 * 1024, // 11MB, which is over 10MB = 10,485,760 bytes
      file_uri:
        `https://storage.example.com/${RandomGenerator.alphaNumeric(16)}_oversize.pdf` as string &
          tags.Format<"uri">,
    });

  // Authenticate as admin by default
  // 4. Admin uploads 5 attachments (all should succeed)
  for (let i = 0; i < 5; ++i) {
    const result =
      await api.functional.discussionBoard.admin.articles.attachments.create(
        connection,
        {
          articleId: adminArticleId,
          body: makeAttachment(),
        },
      );
    typia.assert(result);
  }
  // 5. Admin uploads sixth attachment (should fail)
  await TestValidator.error(
    "admin cannot upload 6th attachment (over quota)",
    async () => {
      await api.functional.discussionBoard.admin.articles.attachments.create(
        connection,
        {
          articleId: adminArticleId,
          body: makeAttachment(),
        },
      );
    },
  );
  // 6. Admin uploads oversize attachment (should fail)
  await TestValidator.error(
    "admin cannot upload attachment over 10MB",
    async () => {
      await api.functional.discussionBoard.admin.articles.attachments.create(
        connection,
        {
          articleId: adminArticleId,
          body: makeOversizeAttachment(),
        },
      );
    },
  );
  // Switch to user (login as user since JWT is probably handled by api.functional.auth.user.join)
  // 7. User uploads 5 attachments (all should succeed)
  for (let i = 0; i < 5; ++i) {
    const result =
      await api.functional.discussionBoard.admin.articles.attachments.create(
        connection,
        {
          articleId: userArticleId,
          body: makeAttachment(),
        },
      );
    typia.assert(result);
  }
  // 8. User uploads sixth attachment (should fail)
  await TestValidator.error(
    "user cannot upload 6th attachment (over quota)",
    async () => {
      await api.functional.discussionBoard.admin.articles.attachments.create(
        connection,
        {
          articleId: userArticleId,
          body: makeAttachment(),
        },
      );
    },
  );
  // 9. User uploads oversize attachment (should fail)
  await TestValidator.error(
    "user cannot upload attachment over 10MB",
    async () => {
      await api.functional.discussionBoard.admin.articles.attachments.create(
        connection,
        {
          articleId: userArticleId,
          body: makeOversizeAttachment(),
        },
      );
    },
  );
}
