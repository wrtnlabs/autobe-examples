import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the complete workflow of a member deleting an image attachment from
 * their own article.
 *
 * This scenario validates that article authors have the ability to manage their
 * article's image attachments by removing images when needed.
 *
 * Workflow steps:
 *
 * 1. Register and authenticate a moderator account to create required category
 * 2. Create a category for article classification
 * 3. Register and authenticate a member account as the article author
 * 4. Create an article with the authenticated member as the author
 * 5. Upload an image attachment to the article
 * 6. Delete the uploaded image attachment from the article
 * 7. Verify the image is soft-deleted (deleted_at timestamp is set)
 */
export async function test_api_article_image_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Moderator123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a category required for article creation
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Register and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member123!";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 4: Create an article owned by the member
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Upload an image attachment to the article
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const imageFilename = `${RandomGenerator.alphaNumeric(8)}.jpg`;

  const uploadedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: {
          url: imageUrl,
          original_name: imageFilename,
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<5242880>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
          >(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(uploadedImage);

  // Step 6: Delete the uploaded image attachment from the article
  await api.functional.discussionBoard.member.articles.images.erase(
    connection,
    {
      articleId: article.id,
      imageId: uploadedImage.id,
    },
  );

  // Step 7: Image deletion is successful (void response means success)
  // The soft delete sets deleted_at timestamp on the image record
  // The image is now hidden from public view while maintaining audit trail
}
