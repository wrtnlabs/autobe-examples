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
 * Test that detailed information about a specific image attachment can be
 * retrieved publicly without authentication.
 *
 * This test validates the public accessibility of image metadata and ensures
 * all necessary information is provided for image display and download.
 *
 * Workflow:
 *
 * 1. Create a member account for article and image creation
 * 2. Create a moderator account for category creation
 * 3. Create a category as moderator
 * 4. Create an article as the member
 * 5. Upload an image to the article
 * 6. Retrieve image details without authentication (as guest)
 * 7. Validate complete metadata (filename, MIME type, size, dimensions,
 *    timestamps)
 * 8. Validate data integrity (image belongs to specified article)
 * 9. Validate privacy (uploader info excludes sensitive fields)
 * 10. Verify response time is within 1 second
 */
export async function test_api_article_image_detail_public_access(
  connection: api.IConnection,
) {
  const startTime = Date.now();

  // Step 1: Create member account for article and image creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: moderatorEmail,
      password: "ModPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create category as moderator (required for article creation)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch to member authentication for article creation
  connection.headers = connection.headers || {};
  connection.headers.Authorization = member.token.access;

  // Step 4: Create an article as member
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Upload an image to the article
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const originalFilename = `test_image_${RandomGenerator.alphaNumeric(8)}.png`;
  const uploadedImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: {
          url: imageUrl,
          original_name: originalFilename,
          mime_type: "image/png",
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

  // Step 6: Retrieve image details without authentication (as guest)
  const guestConnection: api.IConnection = { ...connection, headers: {} };
  const retrievedImage =
    await api.functional.discussionBoard.articles.images.at(guestConnection, {
      articleId: article.id,
      imageId: uploadedImage.id,
    });
  typia.assert(retrievedImage);

  // Step 7: Validate complete metadata is returned
  TestValidator.equals("image ID matches", retrievedImage.id, uploadedImage.id);
  TestValidator.equals(
    "original filename matches",
    retrievedImage.original_name,
    originalFilename,
  );
  TestValidator.predicate(
    "stored filename exists",
    retrievedImage.stored_name.length > 0,
  );
  TestValidator.predicate(
    "MIME type is valid image format",
    ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
      retrievedImage.mime_type,
    ),
  );
  TestValidator.predicate(
    "file size is positive",
    retrievedImage.size_bytes > 0,
  );
  TestValidator.predicate(
    "width is valid",
    retrievedImage.width >= 50 && retrievedImage.width <= 8000,
  );
  TestValidator.predicate(
    "height is valid",
    retrievedImage.height >= 50 && retrievedImage.height <= 8000,
  );
  TestValidator.predicate(
    "upload timestamp exists",
    retrievedImage.created_at.length > 0,
  );
  TestValidator.predicate(
    "URL field exists for download",
    retrievedImage.url.length > 0,
  );

  // Step 8: Validate data integrity - image belongs to specified article
  TestValidator.equals(
    "image belongs to article",
    retrievedImage.discussion_board_article_id,
    article.id,
  );

  // Step 9: Validate uploader information privacy
  TestValidator.predicate(
    "uploader information exists",
    !!retrievedImage.uploader,
  );
  TestValidator.equals(
    "uploader ID matches member",
    retrievedImage.uploader.id,
    member.id,
  );
  TestValidator.equals(
    "uploader username is public",
    retrievedImage.uploader.username,
    member.username,
  );

  // Verify sensitive fields are NOT included in uploader summary
  const uploaderAny = retrievedImage.uploader as any;
  TestValidator.predicate(
    "email is excluded from uploader info",
    uploaderAny.email === undefined,
  );
  TestValidator.predicate(
    "password_hash is excluded",
    uploaderAny.password_hash === undefined,
  );

  // Step 10: Validate response time is within 1 second
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  TestValidator.predicate("response time within 1 second", responseTime < 1000);
}
