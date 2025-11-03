import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * End-to-end creation and validation of a discussion board article by a new
 * authenticated user.
 *
 * 1. Register a new user via /auth/user/join (obtain session & token upon
 *    success).
 * 2. Create a new article with valid title, body, and (optionally) valid
 *    attachments.
 * 3. Validate that the returned article belongs to the authenticated user,
 *    metadata is returned correctly, title/body constraints are respected,
 *    author attribution is correct, the article is not deleted, and attachments
 *    (if any) are processed properly.
 */
export async function test_api_article_creation_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userDisplayName = RandomGenerator.name();
  const userAvatar = RandomGenerator.pick([
    null,
    undefined,
    RandomGenerator.name() + "_avatar.jpg",
  ]);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: userDisplayName,
      avatar_url:
        userAvatar === null
          ? null
          : userAvatar === undefined
            ? undefined
            : "https://cdn.example.com/avatar/" + userAvatar,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);
  TestValidator.equals(
    "registered user's email matches input",
    user.email,
    userEmail,
  );
  TestValidator.equals(
    "registered user's display_name matches input",
    user.display_name,
    userDisplayName,
  );
  if (userAvatar && typeof userAvatar === "string")
    TestValidator.equals(
      "registered user's avatar_url is set (if provided)",
      user.avatar_url,
      "https://cdn.example.com/avatar/" + userAvatar,
    );

  // Step 2: Create a valid article as the authenticated user
  // Article must have valid title (1-100 chars) and body (1-10,000 chars), attachments optional
  const articleTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 12,
  }).substring(0, 50); // ensure < 100
  const articleBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 40,
    sentenceMax: 60,
    wordMin: 4,
    wordMax: 12,
  }).substring(0, 7000); // ensure < 10,000 & > 1
  // Attachments (optional)
  const possibleAttachmentKinds = [
    { kind: "image", ext: ".jpg", mimetype: "image/jpeg" },
    { kind: "image", ext: ".png", mimetype: "image/png" },
    { kind: "image", ext: ".gif", mimetype: "image/gif" },
    { kind: "document", ext: ".pdf", mimetype: "application/pdf" },
    {
      kind: "document",
      ext: ".docx",
      mimetype:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
      kind: "document",
      ext: ".xlsx",
      mimetype:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    { kind: "document", ext: ".txt", mimetype: "text/plain" },
    { kind: "archive", ext: ".zip", mimetype: "application/zip" },
  ] as const;
  const attachments = RandomGenerator.pick([
    [],
    ArrayUtil.repeat(RandomGenerator.pick([1, 2]), (i) => {
      const file = RandomGenerator.pick(possibleAttachmentKinds);
      return {
        filename: RandomGenerator.name(2).replace(/\s/g, "_") + file.ext,
        kind: file.kind,
        mimetype: file.mimetype,
        filesize: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<100> &
            tags.Maximum<10000000>
        >(),
      } satisfies IDiscussionBoardArticleAttachment.ICreate;
    }),
  ]);
  const articleReqBody = {
    title: articleTitle,
    body: articleBody,
    attachments,
  } satisfies IDiscussionBoardArticle.ICreate;
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: articleReqBody,
    });
  typia.assert(article);
  // Step 3: Validation
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleTitle,
  );
  TestValidator.equals("article body matches input", article.body, articleBody);
  TestValidator.predicate(
    "article title length 1-100",
    article.title.length >= 1 && article.title.length <= 100,
  );
  TestValidator.predicate(
    "article body length 1-10,000",
    article.body.length >= 1 && article.body.length <= 10_000,
  );
  TestValidator.equals(
    "article author id matches user id",
    article.author.id,
    user.id,
  );
  TestValidator.equals(
    "article author display_name matches user",
    article.author.display_name,
    user.display_name,
  );
  TestValidator.equals(
    "article author avatar_url matches user",
    article.author.avatar_url ?? undefined,
    user.avatar_url ?? undefined,
  );
  TestValidator.equals("article is not deleted", article.deleted_at, null);
  // Attachment check (each must match filename/kind/mimetype/filesize, kind/value constraints respected)
  TestValidator.equals(
    "article attachment count matches input",
    article.attachments.length,
    attachments?.length ?? 0,
  );
  if ((attachments?.length ?? 0) > 0) {
    ArrayUtil.repeat(attachments.length, (i) => {
      const attIn = attachments[i];
      const attOut = article.attachments[i];
      TestValidator.equals(
        `attachment #${i + 1} filename matches`,
        attOut.filename,
        attIn.filename,
      );
      TestValidator.equals(
        `attachment #${i + 1} kind matches`,
        attOut.kind,
        attIn.kind,
      );
      TestValidator.equals(
        `attachment #${i + 1} mimetype matches`,
        attOut.mimetype,
        attIn.mimetype,
      );
      TestValidator.equals(
        `attachment #${i + 1} filesize matches`,
        attOut.filesize,
        attIn.filesize,
      );
      TestValidator.predicate(
        `attachment #${i + 1} is not deleted`,
        !attOut.deleted_at,
      );
      TestValidator.predicate(
        `attachment #${i + 1} passed virus scan`,
        attOut.virus_scanned === true,
      );
    });
  }
  // Comments count should be zero on new article
  TestValidator.equals(
    "article comments_count is zero for newly created",
    article.comments_count,
    0,
  );
}
