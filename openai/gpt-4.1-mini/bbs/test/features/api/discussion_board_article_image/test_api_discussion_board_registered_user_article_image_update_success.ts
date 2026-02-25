import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_discussion_board_registered_user_article_image_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 0. Prepare admin connection for cross-check (if available) - Not used here
  // 1. Registered user join and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  typia.assert(user);
  // 2. Use user's first article and its first image (or create dummy)
  const article = user.articles[0];
  if (!article) throw new Error("User has no article to test image update.");
  // For image, we rely on existing related images in comments or mock
  // Since no creation API for images explicitly given, we use typical values
  // Construct dummy imageId from first of article's id and generate imageId
  // Because images normally must exist, we assume an imageId (simulate scenario)
  // As the scenario requires ownership, we take the imageId from the article's images list
  // but article type does not expose image list, so we must simulate or random
  // Instead, we prepare to 'update' an image with a dummy imageId
  // Since we do not have image list, we'll generate one imageId and do update
  const imageId = typia.random<string & tags.Format<"uuid">>();
  // 3. Valid update data with description
  const bodyWithDescription = {
    imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(10)}.jpg`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: RandomGenerator.alphaNumeric(1).charCodeAt(0) % 10, // 0-9
  };
  // Update image with description
  const updatedWithDesc =
    await api.functional.discussionBoard.registeredUser.articles.images.updateImage(
      userConnection,
      {
        articleId: article.id,
        imageId: imageId,
        body: bodyWithDescription,
      },
    );
  typia.assert(updatedWithDesc);
  TestValidator.equals(
    "imageUrl updated with description",
    updatedWithDesc.imageUrl,
    bodyWithDescription.imageUrl,
  );
  TestValidator.equals(
    "description updated",
    updatedWithDesc.description,
    bodyWithDescription.description,
  );
  TestValidator.equals(
    "displayOrder updated",
    updatedWithDesc.displayOrder,
    bodyWithDescription.displayOrder,
  );
  // 4. Update without description field (should keep original description)
  const bodyWithoutDescription = {
    imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(10)}.jpg`,
    displayOrder: RandomGenerator.alphaNumeric(1).charCodeAt(0) % 10, // 0-9
  };
  const updatedWithoutDesc =
    await api.functional.discussionBoard.registeredUser.articles.images.updateImage(
      userConnection,
      {
        articleId: article.id,
        imageId: imageId,
        body: bodyWithoutDescription,
      },
    );
  typia.assert(updatedWithoutDesc);
  TestValidator.equals(
    "imageUrl updated without description",
    updatedWithoutDesc.imageUrl,
    bodyWithoutDescription.imageUrl,
  );
  TestValidator.equals(
    "description unchanged or null",
    updatedWithoutDesc.description,
    updatedWithDesc.description,
  );
  TestValidator.equals(
    "displayOrder updated without description",
    updatedWithoutDesc.displayOrder,
    bodyWithoutDescription.displayOrder,
  );
  // 5. Unauthorized attempt
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedBody = {
    imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(10)}.png`,
    displayOrder: 1,
  };
  await TestValidator.httpError("update image unauthorized", 403, async () => {
    await api.functional.discussionBoard.registeredUser.articles.images.updateImage(
      unauthorizedConnection,
      {
        articleId: article.id,
        imageId: imageId,
        body: unauthorizedBody,
      },
    );
  });
}
