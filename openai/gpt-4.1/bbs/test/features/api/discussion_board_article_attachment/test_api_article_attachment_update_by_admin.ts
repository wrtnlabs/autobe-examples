import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that an admin can update or replace an attachment on any article
 * (regardless of owner), that admin permissions are enforced, and that audit
 * trail and soft-delete behavior work correctly.
 *
 * Steps:
 *
 * 1. Register an admin account and a user account (separate identities).
 * 2. Create an article as the user.
 * 3. Attach a file to the article as the user.
 * 4. Switch authentication to admin.
 * 5. Update the attachment's metadata/content as admin (file_name, mime_type,
 *    file_size, file_uri). Confirm all updated fields reflect changes and
 *    unchanged fields remain stable (id, article_id, created_at).
 * 6. Soft-delete the attachment by setting deleted_at as admin (current timestamp
 *    in ISO8601 format). Confirm deleted_at is set, other properties persist,
 *    and logical removal is reflected (does not physically remove record).
 */
export async function test_api_article_attachment_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin & user accounts (different emails)
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin_password = "Adm1n!234";
  const user_email = typia.random<string & tags.Format<"email">>();
  const user_password = "User@5678";
  // admin join
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: admin_email,
        password: admin_password,
        href: "https://test-admin-join", // required URI
        referrer: "https://test-admin-join-ref", // required URI
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // user join
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user_email,
        password: user_password,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);

  // user creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 10,
        }) as string & tags.MaxLength<200>,
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 16,
          wordMin: 3,
          wordMax: 8,
        }) as string & tags.MaxLength<10000>,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // user attaches a file
  const attachment_create = {
    file_name: `test_${RandomGenerator.alphaNumeric(5)}.png` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    mime_type: "image/png" as string & tags.MinLength<3> & tags.MaxLength<63>,
    file_size: 5327 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<10485760>,
    file_uri:
      `https://storage.test.files/${RandomGenerator.alphaNumeric(32)}.png` as string &
        tags.Format<"uri">,
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const att: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.user.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachment_create,
      },
    );
  typia.assert(att);
  TestValidator.equals(
    "file_name matches input",
    att.file_name,
    attachment_create.file_name,
  );
  TestValidator.equals(
    "mime_type matches input",
    att.mime_type,
    attachment_create.mime_type,
  );
  TestValidator.equals(
    "file_size matches input",
    att.file_size,
    attachment_create.file_size,
  );
  TestValidator.equals(
    "file_uri matches input",
    att.file_uri,
    attachment_create.file_uri,
  );
  TestValidator.equals("article_id matches", att.article_id, article.id);
  TestValidator.equals("deleted_at is null", att.deleted_at, null);

  // 4. Switch to admin account for update
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin_email,
      password: admin_password,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 5. Update attachment metadata & file as admin
  const update1 = {
    file_name: `updated_${RandomGenerator.alphaNumeric(8)}.jpg` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    mime_type: "image/jpeg" as string & tags.MinLength<3> & tags.MaxLength<63>,
    file_size: 14224 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<10485760>,
    file_uri:
      `https://storage.test.files/${RandomGenerator.alphaNumeric(35)}.jpg` as string &
        tags.Format<"uri">,
  } satisfies IDiscussionBoardArticleAttachment.IUpdate;
  const att_updated: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.admin.articles.attachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: att.id,
        body: update1,
      },
    );
  typia.assert(att_updated);
  TestValidator.equals("updated id unchanged", att_updated.id, att.id);
  TestValidator.equals(
    "updated article_id unchanged",
    att_updated.article_id,
    att.article_id,
  );
  TestValidator.equals(
    "updated file_name applied",
    att_updated.file_name,
    update1.file_name,
  );
  TestValidator.equals(
    "updated mime_type applied",
    att_updated.mime_type,
    update1.mime_type,
  );
  TestValidator.equals(
    "updated file_size applied",
    att_updated.file_size,
    update1.file_size,
  );
  TestValidator.equals(
    "updated file_uri applied",
    att_updated.file_uri,
    update1.file_uri,
  );
  TestValidator.equals(
    "deleted_at still null after update",
    att_updated.deleted_at,
    null,
  );

  // 6. Soft-delete the attachment as admin (set deleted_at)
  const now = new Date().toISOString();
  const update2 = {
    deleted_at: now as string & tags.Format<"date-time">,
  } satisfies IDiscussionBoardArticleAttachment.IUpdate;
  const att_deleted: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.admin.articles.attachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: att.id,
        body: update2,
      },
    );
  typia.assert(att_deleted);
  TestValidator.equals(
    "deleted_at correctly set after soft-delete",
    att_deleted.deleted_at,
    now,
  );
  TestValidator.equals(
    "file_name persists after soft-delete",
    att_deleted.file_name,
    update1.file_name,
  );
  TestValidator.equals(
    "id and article_id persist after soft-delete",
    att_deleted.id,
    att.id,
  );
}
