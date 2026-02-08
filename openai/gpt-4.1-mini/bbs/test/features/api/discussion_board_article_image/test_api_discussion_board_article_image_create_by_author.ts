import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_images_create_image } from "../../../generate/generate_random_discussion_board_registered_user_articles_images_create_image";

export async function test_api_discussion_board_article_image_create_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create article as the authenticated user
  const rawArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  const article = typia.assert(rawArticle) as IDiscussionBoardArticle & { id: string };
  // 3. Create a new image attachment for the created article
  const imageCreateBody: IDiscussionBoardArticleImage.ICreate = {
    imageUrl: `https://cdn.example.com/images/${RandomGenerator.alphabets(16)}.jpg`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 1,
  };
  const rawImage =
    await generate_random_discussion_board_registered_user_articles_images_create_image(
      userConnection,
      {
        params: { articleId: article.id },
        body: imageCreateBody,
      },
    );
  const image = typia.assert(rawImage) as IDiscussionBoardArticleImage & {
    id: string;
    articleId: string;
    imageUrl: string;
    description: string;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
  };
  // 4. Validate response fields
  TestValidator.predicate(
    "image id exists",
    typeof image.id === "string" && image.id.length > 0,
  );
  TestValidator.equals(
    "image articleId matches article id",
    image.articleId,
    article.id,
  );
  const imageCreateBodyAny = imageCreateBody as any;
  TestValidator.equals(
    "imageUrl matches input",
    image.imageUrl,
    imageCreateBodyAny.imageUrl,
  );
  TestValidator.equals(
    "description matches input",
    image.description,
    imageCreateBodyAny.description,
  );
  TestValidator.equals(
    "displayOrder matches input",
    image.displayOrder,
    imageCreateBodyAny.displayOrder,
  );
  // 5. Validate timestamps exist (createdAt and updatedAt)
  TestValidator.predicate(
    "createdAt exists and valid ISO string",
    typeof image.createdAt === "string" && image.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt exists and valid ISO string",
    typeof image.updatedAt === "string" && image.updatedAt.length > 0,
  );
}
