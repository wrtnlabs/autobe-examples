import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_article_image_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for article and image creation
  const memberRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(member);

  // Step 2: Create a discussion board article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Upload an image attachment to the article
  const imageData = {
    original_filename: `${RandomGenerator.name(1)}.png`,
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: "image/png",
    storage_url: typia.random<string & tags.Format<"uri">>(),
    width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const uploadedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: imageData,
      },
    );
  typia.assert(uploadedImage);

  // Step 4: Create an unauthenticated connection for public access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 5: Retrieve image details without authentication
  const retrievedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.articles.images.at(unauthConnection, {
      articleId: article.id,
      imageId: uploadedImage.id,
    });
  typia.assert(retrievedImage);

  // Step 6: Validate all image metadata fields
  TestValidator.equals("image ID matches", retrievedImage.id, uploadedImage.id);
  TestValidator.equals(
    "article ID matches",
    retrievedImage.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "original filename matches",
    retrievedImage.original_filename,
    imageData.original_filename,
  );
  TestValidator.equals(
    "file size matches",
    retrievedImage.file_size,
    imageData.file_size,
  );
  TestValidator.equals(
    "content type matches",
    retrievedImage.content_type,
    imageData.content_type,
  );
  TestValidator.equals(
    "storage URL matches",
    retrievedImage.storage_url,
    imageData.storage_url,
  );
  TestValidator.equals("width matches", retrievedImage.width, imageData.width);
  TestValidator.equals(
    "height matches",
    retrievedImage.height,
    imageData.height,
  );
  TestValidator.equals("deleted_at is null", retrievedImage.deleted_at, null);
}
