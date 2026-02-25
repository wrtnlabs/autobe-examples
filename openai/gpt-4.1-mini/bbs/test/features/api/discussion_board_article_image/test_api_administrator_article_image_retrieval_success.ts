import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_images_create_image } from "../../../generate/generate_random_discussion_board_registered_user_articles_images_create_image";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_administrator_article_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinOutput = await authorize_administrator_join(adminConnection, {
    body: { password: adminPassword },
  });
  typia.assert(adminJoinOutput);
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoinOutput.email,
      password: adminPassword,
      href: "http://localhost/login",
      referrer: "http://localhost/referrer",
      ip: null,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });
  // 2. Registered User setup
  const userConnection: api.IConnection = { host: connection.host };
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userJoinOutput = await authorize_registered_user_join(userConnection, {
    body: { password: userPassword },
  });
  typia.assert(userJoinOutput);
  // Note: The join utility sets authorization header, no need to login again
  // 3. Create an article as registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          title: "Test Article for Image Retrieval",
          content: "Content of article.",
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 4. Attach an image to the article
  const image =
    await generate_random_discussion_board_registered_user_articles_images_create_image(
      userConnection,
      {
        params: { articleId: article.id },
        body: { imageUrl: "https://example.com/sample.png", displayOrder: 1 },
      },
    );
  typia.assert(image);
  // 5. As administrator, retrieve attached image by articleId and imageId
  const retrievedImage =
    await api.functional.discussionBoard.administrator.articles.images.atImage(
      adminConnection,
      { articleId: article.id, imageId: image.id },
    );
  typia.assert(retrievedImage);
  // 6. Validate retrieved image metadata
  TestValidator.equals("image id", retrievedImage.id, image.id);
  TestValidator.equals(
    "discussionBoardArticleId",
    retrievedImage.discussionBoardArticleId,
    article.id,
  );
  TestValidator.equals("imageUrl", retrievedImage.imageUrl, image.imageUrl);
  TestValidator.equals(
    "description",
    retrievedImage.description ?? null,
    image.description ?? null,
  );
  TestValidator.equals(
    "displayOrder",
    retrievedImage.displayOrder,
    image.displayOrder,
  );
  TestValidator.predicate(
    "createdAt format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      retrievedImage.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      retrievedImage.updatedAt,
    ),
  );
}
