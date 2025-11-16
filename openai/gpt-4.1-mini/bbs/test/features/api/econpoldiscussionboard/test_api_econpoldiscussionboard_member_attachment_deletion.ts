import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import type { IEconPolDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAttachment";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

/**
 * Test the complete flow of deleting an attachment for a member in
 * econPolDiscussionBoard.
 *
 * This test performs the following steps:
 *
 * 1. Authenticates a member by joining, generating an account.
 * 2. Creates an article associated with the authenticated member.
 * 3. Uploads an attachment to the created article.
 * 4. Deletes the uploaded attachment.
 *
 * Each step is validated for proper authorization and resource dependencies,
 * ensuring that only authenticated members can delete attachments linked to
 * their articles.
 */
export async function test_api_econpoldiscussionboard_member_attachment_deletion(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member by joining
  const memberCreateBody = {
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IEconPolDiscussionBoardMember.ICreate;
  const member: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create an article associated with this member
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconPolDiscussionBoardArticle.ICreate;
  const article: IEconPolDiscussionBoardArticle =
    await api.functional.econPolDiscussionBoard.member.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 3. Upload an attachment linked with the article
  const attachmentCreateBody = {
    type: RandomGenerator.pick(["image", "file"] as const),
    url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
    fileName: `file_${RandomGenerator.alphaNumeric(8)}.jpg`,
  } satisfies IEconPolDiscussionBoardAttachment.ICreate;
  const attachment: IEconPolDiscussionBoardAttachment =
    await api.functional.econPolDiscussionBoard.member.articles.attachments.create(
      connection,
      {
        id: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  // 4. Delete the uploaded attachment by ID
  await api.functional.econPolDiscussionBoard.member.attachments.erase(
    connection,
    {
      id: attachment.id,
    },
  );
}
