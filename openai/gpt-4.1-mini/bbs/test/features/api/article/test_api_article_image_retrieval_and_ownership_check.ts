import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_image_retrieval_and_ownership_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdministrator actor join and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  superAdminConnection.headers = { Authorization: superAdminAuth.token.access };
  // 2. RegisteredUser actor join and login
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const registeredUserAuth = await authorize_registered_user_join(
    registeredUserConnection,
    { body: {} },
  );
  typia.assert(registeredUserAuth);
  registeredUserConnection.headers = {
    Authorization: registeredUserAuth.token.access,
  };
  // 3. RegisteredUser creates a new article with random data
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      {},
    );
  typia.assert(article);
  // Ensure the article has at least one image; if none, create a dummy image entry in the test context
  if (article.images.length === 0) {
    // For testing, emulate creation of one image by creating an article again with image attachments
    const articleWithImage =
      await generate_random_discussion_board_registered_user_articles_create(
        registeredUserConnection,
        {
          body: {
            attachments: [
              {
                fileName: `test_img_${RandomGenerator.alphaNumeric(8)}.png`,
                fileType: "image/png",
                fileSize: 12345,
                downloadUrl: "http://example.com/test.png",
                displayOrder: 1,
              },
            ],
          },
        },
      );
    typia.assert(articleWithImage);
    // Use the newly created article with image
    const newArticle = articleWithImage;
    // It must have at least one image
    if (newArticle.images.length === 0) {
      throw new Error(
        "Test setup failure: no images available on created article.",
      );
    }
    // Continue the test with the article that has images
    // Fetch an image from the images array
    const validImage = newArticle.images[0];
    // 4. SuperAdministrator retrieves the image correctly
    const fetchedImage =
      await api.functional.discussionBoard.superAdministrator.articles.images.atImage(
        superAdminConnection,
        {
          articleId: newArticle.id,
          imageId: validImage.id,
        },
      );
    typia.assert(fetchedImage);
    // Validation of important fields
    TestValidator.equals(
      "imageUrl matches",
      fetchedImage.imageUrl,
      validImage.imageUrl,
    );
    TestValidator.equals(
      "displayOrder matches",
      fetchedImage.displayOrder,
      validImage.displayOrder,
    );
    // description can be null or string
    TestValidator.predicate(
      "description type",
      typeof fetchedImage.description === "string" ||
        fetchedImage.description === null,
    );
    TestValidator.equals(
      "createdAt matches",
      fetchedImage.createdAt,
      validImage.createdAt,
    );
    TestValidator.equals(
      "updatedAt matches",
      fetchedImage.updatedAt,
      validImage.updatedAt,
    );
    // 5. Attempt fetching image with invalid imageId for article, expect 404
    await TestValidator.httpError(
      "fetch non-owned image returns 404",
      404,
      async () => {
        await api.functional.discussionBoard.superAdministrator.articles.images.atImage(
          superAdminConnection,
          {
            articleId: newArticle.id,
            imageId: typia.random<string & tags.Format<"uuid">>(),
          },
        );
      },
    );
    return;
  }
  // If original article has images
  // Fetch an image from the images array
  const validImage = article.images[0];
  // 4. SuperAdministrator retrieves the image correctly
  const fetchedImage =
    await api.functional.discussionBoard.superAdministrator.articles.images.atImage(
      superAdminConnection,
      {
        articleId: article.id,
        imageId: validImage.id,
      },
    );
  typia.assert(fetchedImage);
  // Validation of important fields
  TestValidator.equals(
    "imageUrl matches",
    fetchedImage.imageUrl,
    validImage.imageUrl,
  );
  TestValidator.equals(
    "displayOrder matches",
    fetchedImage.displayOrder,
    validImage.displayOrder,
  );
  // description can be null or string
  TestValidator.predicate(
    "description type",
    typeof fetchedImage.description === "string" ||
      fetchedImage.description === null,
  );
  TestValidator.equals(
    "createdAt matches",
    fetchedImage.createdAt,
    validImage.createdAt,
  );
  TestValidator.equals(
    "updatedAt matches",
    fetchedImage.updatedAt,
    validImage.updatedAt,
  );
  // 5. Attempt fetching image with invalid imageId for article, expect 404
  await TestValidator.httpError(
    "fetch non-owned image returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.articles.images.atImage(
        superAdminConnection,
        {
          articleId: article.id,
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
