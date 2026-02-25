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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_images_create_image } from "../../../generate/generate_random_discussion_board_registered_user_articles_images_create_image";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_discussion_board_article_image_create_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful image creation by article owner
  {
    // Register and authorize a user
    const userConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_registered_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "strongpassword123",
      },
    });
    // Set Authorization header with token
    userConnection.headers = { Authorization: authorized.token.access };
    // Create an article as the authorized user
    const article =
      await generate_random_discussion_board_registered_user_articles_create(
        userConnection,
        { body: { sectionId: typia.random<string & tags.Format<"uuid">>() } },
      );
    typia.assert(article);
    // Create an image attachment for the article
    const imageCreateBody: IDiscussionBoardArticleImage.ICreate = {
      imageUrl: `https://example.com/images/${RandomGenerator.alphabets(10)}.png`,
      description: RandomGenerator.paragraph({ sentences: 1 }),
      displayOrder: 1,
    };
    const image =
      await generate_random_discussion_board_registered_user_articles_images_create_image(
        userConnection,
        { body: imageCreateBody, params: { articleId: article.id } },
      );
    typia.assert(image);
    // Validate fields
    TestValidator.equals(
      "articleId matches",
      image.discussionBoardArticleId,
      article.id,
    );
    TestValidator.predicate(
      "imageUrl exists",
      typeof image.imageUrl === "string" && image.imageUrl.length > 0,
    );
    TestValidator.equals("displayOrder", image.displayOrder, 1);
    TestValidator.predicate(
      "createdAt present",
      typeof image.createdAt === "string" && image.createdAt.length > 0,
    );
    TestValidator.predicate(
      "updatedAt present",
      typeof image.updatedAt === "string" && image.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "id exists",
      typeof image.id === "string" && image.id.length > 0,
    );
    // description is optional and may be null or string
    TestValidator.predicate(
      "description is string or null",
      image.description === null || typeof image.description === "string",
    );
  }
  // Scenario 2: Unauthorized access when attaching image to other user's article
  {
    // Register first user A and create article
    const userAConnection: api.IConnection = { host: connection.host };
    const authorizedA = await authorize_registered_user_join(userAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "strongpasswordA123",
      },
    });
    userAConnection.headers = { Authorization: authorizedA.token.access };
    const articleA =
      await generate_random_discussion_board_registered_user_articles_create(
        userAConnection,
        {},
      );
    typia.assert(articleA);
    // Register second user B
    const userBConnection: api.IConnection = { host: connection.host };
    const authorizedB = await authorize_registered_user_join(userBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "strongpasswordB123",
      },
    });
    userBConnection.headers = { Authorization: authorizedB.token.access };
    // User B tries to attach image to user A's article - expect failure
    const imageCreateBodyB: IDiscussionBoardArticleImage.ICreate = {
      imageUrl: `https://example.com/images/${RandomGenerator.alphabets(10)}.png`,
      displayOrder: 1,
    };
    await TestValidator.httpError(
      "unauthorized image attachment",
      [401, 403],
      async () => {
        await generate_random_discussion_board_registered_user_articles_images_create_image(
          userBConnection,
          { body: imageCreateBodyB, params: { articleId: articleA.id } },
        );
      },
    );
  }
  // Scenario 3: Validation error when required fields are missing
  {
    // Register and authorize a user
    const userConnection2: api.IConnection = { host: connection.host };
    const authorized2 = await authorize_registered_user_join(userConnection2, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "strongpasswordXYZ",
      },
    });
    userConnection2.headers = { Authorization: authorized2.token.access };
    // Create article
    const article2 =
      await generate_random_discussion_board_registered_user_articles_create(
        userConnection2,
        {},
      );
    typia.assert(article2);
    // Try to create image missing imageUrl
    const invalidImageBody1 = {
      // imageUrl missing
      displayOrder: 1,
    } as unknown as IDiscussionBoardArticleImage.ICreate;
    await TestValidator.httpError(
      "missing imageUrl validation",
      400,
      async () => {
        await generate_random_discussion_board_registered_user_articles_images_create_image(
          userConnection2,
          { body: invalidImageBody1, params: { articleId: article2.id } },
        );
      },
    );
    // Try to create image missing displayOrder
    const invalidImageBody2 = {
      imageUrl: `https://example.com/images/${RandomGenerator.alphabets(10)}.png`,
      // displayOrder missing
    } as unknown as IDiscussionBoardArticleImage.ICreate;
    await TestValidator.httpError(
      "missing displayOrder validation",
      400,
      async () => {
        await generate_random_discussion_board_registered_user_articles_images_create_image(
          userConnection2,
          { body: invalidImageBody2, params: { articleId: article2.id } },
        );
      },
    );
  }
}
