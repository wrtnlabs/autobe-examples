import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import type { IEconPolDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAttachment";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function test_api_econpoldiscussionboard_article_attachment_upload_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register a new member and authenticate
  const memberCreateBody = {
    username: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IEconPolDiscussionBoardMember.ICreate;
  const member: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // Step 2: Create a new article as the authenticated member
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
  TestValidator.predicate(
    "article id is a valid uuid",
    typeof article.id === "string" && article.id.length > 0,
  );

  // Step 3: Upload an attachment (randomly choose image or file) linked to the created article
  const type = RandomGenerator.pick(["image", "file"] as const);
  const fileName =
    type === "image"
      ? `image-${RandomGenerator.alphaNumeric(6)}.png`
      : `file-${RandomGenerator.alphaNumeric(6)}.pdf`;
  const url = `https://cdn.example.com/${fileName}`;
  const attachmentCreateBody = {
    type,
    url: url as string & tags.Format<"uri">,
    fileName,
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

  // Validate attachment fields
  TestValidator.equals(
    "attachment articleId matches article id",
    attachment.articleId,
    article.id,
  );
  TestValidator.equals(
    "attachment type matches input type",
    attachment.type,
    type,
  );
  TestValidator.equals(
    "attachment fileName matches input fileName",
    attachment.fileName,
    fileName,
  );
  TestValidator.predicate(
    "attachment url format is valid uri",
    typeof attachment.url === "string" && attachment.url.startsWith("https://"),
  );
  TestValidator.predicate(
    "attachment id is a valid uuid",
    typeof attachment.id === "string" && attachment.id.length > 0,
  );
  TestValidator.predicate(
    "attachment uploadedAt is valid date-time string",
    typeof attachment.uploadedAt === "string" &&
      !Number.isNaN(Date.parse(attachment.uploadedAt)),
  );
}
