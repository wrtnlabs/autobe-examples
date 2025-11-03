import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_article_attachment_remove_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1) Member A: sign up (author/uploader)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.alphaNumeric(8);
  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: authorUsername,
      email: authorEmail,
      password: "P4ssw0rd!1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(author);

  // 2) Create an article as member A
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3) Upload an attachment as member A
  const attachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: `${RandomGenerator.alphaNumeric(6)}.png`,
          storage_key: typia.random<string & tags.Format<"uri">>(),
          mime_type: "image/png",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<0> &
              tags.Maximum<5242880>
          >(),
          is_image: true,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Basic sanity checks on created attachment
  TestValidator.predicate("attachment has id", !!attachment.id);
  TestValidator.equals(
    "attachment initially not soft-deleted",
    attachment.deleted_at,
    null,
  );

  // 4) Create member B (different user) - this will replace connection header with tokenB
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherUsername = RandomGenerator.alphaNumeric(8);
  const other = await api.functional.auth.member.join(connection, {
    body: {
      username: otherUsername,
      email: otherEmail,
      password: "Secur3P@ssword!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(other);

  // Ensure that the uploader is not the same as other member
  if (attachment.uploader && other.member) {
    TestValidator.notEquals(
      "uploader is not the deleter",
      attachment.uploader.id,
      other.member.id,
    );
  }

  // 5) Attempt to DELETE the attachment as member B -> expect a 403/forbidden error
  await TestValidator.error(
    "non-owner cannot delete someone else's attachment",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
        },
      );
    },
  );

  // 6) Validate no side-effects observed on the previously returned attachment object
  // (deleted_at should remain null in the originally returned metadata)
  TestValidator.equals(
    "attachment remains not soft-deleted after failed delete attempt",
    attachment.deleted_at,
    null,
  );
}
