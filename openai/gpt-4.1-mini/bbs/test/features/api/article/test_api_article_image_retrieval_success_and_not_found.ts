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

export async function test_api_article_image_retrieval_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    { body: {} },
  );
  typia.assert(superAdmin);
  // 2. Authenticate as registeredUser
  const userConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(registeredUser);
  // 3. Create a new article as the registeredUser
  let article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  // 4. Add images to the created article
  // If no images exist, add images metadata manually in create body before creation.
  if (article.images.length === 0) {
    // Recreate article with images
    const newImage = {
      discussionBoardArticleId: article.id,
      imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      displayOrder: 0,
    };
    // Extract section id from article.section object
    const sectionSummary = article.section as {
      id: string;
    };
    // Create article with images
    const articleWithImages =
      await generate_random_discussion_board_registered_user_articles_create(
        userConnection,
        {
          body: {
            title: article.title,
            content: article.content,
            sectionId: sectionSummary.id,
            attachments: [],
            tags: [],
            // @ts-expect-error: No direct typing for images in ICreate, but allowed to assign for test
            images: [newImage],
          },
        },
      );
    typia.assert(articleWithImages);
    // Replace the article variable reference with new one
    article = articleWithImages;
  }
  // Prepare valid existing image to retrieve
  const existingImage = article.images[0];
  typia.assert(existingImage);
  // 5. As the superAdministrator, retrieve an existing image attached to the article
  const imageFetched =
    await api.functional.discussionBoard.superAdministrator.articles.images.atImage(
      superAdminConnection,
      {
        articleId: article.id,
        imageId: existingImage.id,
      },
    );
  typia.assert(imageFetched);
  // 6. Verify the response contains full metadata
  TestValidator.equals(
    "image retrieved url matches",
    imageFetched.imageUrl,
    existingImage.imageUrl,
  );
  TestValidator.equals(
    "image retrieved description matches",
    imageFetched.description,
    existingImage.description,
  );
  TestValidator.equals(
    "image retrieved displayOrder matches",
    imageFetched.displayOrder,
    existingImage.displayOrder,
  );
  TestValidator.equals(
    "image retrieved createdAt matches",
    imageFetched.createdAt,
    existingImage.createdAt,
  );
  TestValidator.equals(
    "image retrieved updatedAt matches",
    imageFetched.updatedAt,
    existingImage.updatedAt,
  );
  // 7. Attempt to retrieve an image with a valid but mismatched imageId for the article
  const wrongImageId = typia.random<string & tags.Format<"uuid">>();
  // Make sure wrongImageId is different
  TestValidator.notEquals(
    "wrong image id is different",
    wrongImageId,
    existingImage.id,
  );
  await TestValidator.httpError(
    "retrieve image with wrong imageId should be 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.articles.images.atImage(
        superAdminConnection,
        {
          articleId: article.id,
          imageId: wrongImageId,
        },
      );
    },
  );
}
