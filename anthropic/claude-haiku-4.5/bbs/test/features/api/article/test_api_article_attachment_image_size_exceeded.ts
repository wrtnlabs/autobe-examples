import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test attachment of an image file exceeding the 5MB size limit.
 *
 * A contributor creates an article and attempts to attach an image larger than
 * 5MB. The test validates that the system rejects the oversized image and
 * returns an appropriate error message indicating the size limit violation.
 *
 * Test workflow:
 *
 * 1. Register a new contributor account
 * 2. Create an article draft
 * 3. Attempt to attach an image exceeding the 5MB size limit
 * 4. Verify that the API rejects the oversized image with an error
 */
export async function test_api_article_attachment_image_size_exceeded(
  connection: api.IConnection,
) {
  // 1. Register a new contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(12),
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Create an article draft
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Attempt to attach an image exceeding 5MB (5,242,880 bytes)
  const oversizedImageSize = 5242880 + 1024; // 5MB + 1KB exceeds limit

  await TestValidator.error(
    "image exceeding 5MB size limit should be rejected",
    async () => {
      await api.functional.discussionBoard.contributor.articles.attachments.attach(
        connection,
        {
          articleId: article.id,
          body: {
            original_filename: "oversized_image.jpg",
            file_type: "jpg",
            file_size: oversizedImageSize,
            mime_type: "image/jpeg",
            display_url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    },
  );
}
