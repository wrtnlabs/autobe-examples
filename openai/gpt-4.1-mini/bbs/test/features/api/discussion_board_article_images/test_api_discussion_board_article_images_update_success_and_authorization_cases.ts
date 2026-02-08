import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { ArrayUtil, TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";

export async function test_api_discussion_board_article_images_update_success_and_authorization_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully update images for an article
  // Register a new user actor
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = { Authorization: `Bearer ${userAuth.token.access}` };
  // Create an article by this user
  const originalArticle = await generate_random_discussion_board_registered_user_articles_create(
    userConnection,
    { body: {} },
  );
  typia.assert(originalArticle);

  // cast originalArticle to type with id property
  const articleWithId = originalArticle as IDiscussionBoardArticle & { id: string & tags.Format<"uuid"> };

  // Prepare the initial images to update
  // For test, simulate images as 3 dummy images with id, description, display_order
  // Cast dummy images to type that includes id property
  const existingImages = ArrayUtil.repeat(
    3,
    (index: number) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      image_url: `https://cdn.example.com/image-${index + 1}.jpg`,
      description: `Original desc ${index + 1}`,
      display_order: index + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    } as IDiscussionBoardArticleImage & { id: string & tags.Format<"uuid"> }),
  );

  // Prepare updated images array:
  // - Update description and display_order of first two images
  // - Third image omitted (soft deleted)
  // - Add one new image without id
  // Define type for update images request
  type UpdateImageDTO = Array<{
    id?: string & tags.Format<"uuid">;
    description: string;
    image_url?: string;
    display_order: number;
  }>;

  const updatedImagesBody: UpdateImageDTO = [
    {
      id: existingImages[0].id,
      description: `Updated description 1`,
      display_order: 2,
    },
    {
      id: existingImages[1].id,
      description: `Updated description 2`,
      display_order: 1,
    },
    {
      description: `Newly added image`,
      image_url: `https://cdn.example.com/image-new.jpg`,
      display_order: 3,
    },
  ];

  // Call the updateImages API
  const updatedImagesResponse = await api.functional.discussionBoard.registeredUser.articles.images.updateImages(
    userConnection,
    {
      articleId: articleWithId.id,
      body: updatedImagesBody,
    },
  );
  typia.assert(updatedImagesResponse);

  // Define type for updated images response
  type UpdatedImageResponse = {
    id: string & tags.Format<"uuid">;
    description: string;
    display_order: number;
  }[];

  const updatedImages = updatedImagesResponse as UpdatedImageResponse;

  // Validate that updated images reflect all changes atomically
  // Check count matches
  TestValidator.equals(
    "updated images count",
    updatedImages.length,
    updatedImagesBody.length,
  );

  // Check updated descriptions and order for images with ids
  const updatedWithIds = updatedImages.filter(
    (img) => updatedImagesBody.some((body) => body.id !== undefined && body.id === img.id),
  );
  TestValidator.equals(
    "updated images with ids count",
    updatedWithIds.length,
    2,
  );

  for (const updatedImage of updatedWithIds) {
    const expectedBody = updatedImagesBody.find((body) => body.id === updatedImage.id);
    if (expectedBody === undefined) continue;
    TestValidator.equals(
      `image description for ${updatedImage.id}`,
      updatedImage.description,
      expectedBody.description,
    );
    TestValidator.equals(
      `image display order for ${updatedImage.id}`,
      updatedImage.display_order,
      expectedBody.display_order,
    );
  }

  // Check new image exists in response
  const newImages = updatedImages.filter(
    (img) => !updatedImagesBody.some((body) => body.id !== undefined && body.id === img.id),
  );
  TestValidator.predicate(
    "new image added",
    newImages.length === 1 && newImages[0].description === "Newly added image",
  );

  // Scenario 1 Authorization: unauthorized user cannot update images
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherAuth = await authorize_registered_user_join(otherUserConnection, {
    body: {},
  });
  otherUserConnection.headers = {
    Authorization: `Bearer ${otherAuth.token.access}`,
  };
  await TestValidator.error("unauthorized image update should fail", async () => {
    await api.functional.discussionBoard.registeredUser.articles.images.updateImages(otherUserConnection, {
      articleId: articleWithId.id,
      body: updatedImagesBody,
    });
  });

  // Scenario 2: userB attempts to update images on userA's article
  const userAConn: api.IConnection = { host: connection.host };
  const userAAuth = await authorize_registered_user_join(userAConn, {
    body: {},
  });
  userAConn.headers = { Authorization: `Bearer ${userAAuth.token.access}` };

  const userBConn: api.IConnection = { host: connection.host };
  const userBAuth = await authorize_registered_user_join(userBConn, {
    body: {},
  });
  userBConn.headers = { Authorization: `Bearer ${userBAuth.token.access}` };

  const articleUserA = await generate_random_discussion_board_registered_user_articles_create(userAConn, { body: {} });
  typia.assert(articleUserA);
  // cast articleUserA to type with id
  const articleUserAWithId = articleUserA as IDiscussionBoardArticle & { id: string & tags.Format<"uuid"> };

  await TestValidator.httpError("forbidden update by unauthorized user", 403, async () => {
    await api.functional.discussionBoard.registeredUser.articles.images.updateImages(userBConn, {
      articleId: articleUserAWithId.id,
      body: updatedImagesBody,
    });
  });

  // Scenario 3: update images for non-existent article
  const userCConn: api.IConnection = { host: connection.host };
  const userCAuth = await authorize_registered_user_join(userCConn, {
    body: {},
  });
  userCConn.headers = { Authorization: `Bearer ${userCAuth.token.access}` };

  const invalidArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("update images non-existent article", 404, async () => {
    await api.functional.discussionBoard.registeredUser.articles.images.updateImages(userCConn, {
      articleId: invalidArticleId,
      body: updatedImagesBody,
    });
  });
}
