import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleImageRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageRequest";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_administrator_article_images_update(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Administrator successfully updates images for an existing article.
  // Create administrator connection and join/login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinOutput = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    },
  });
  typia.assert(adminJoinOutput);
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoinOutput.email,
      password: adminPassword,
      href: "http://localhost/login",
      referrer: "http://localhost/",
      ip: null,
    },
  });
  // Create registered user connection and join/login
  const userConnection: api.IConnection = { host: connection.host };
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userJoinOutput = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: userPassword,
    },
  });
  typia.assert(userJoinOutput);
  await authorize_registered_user_login(userConnection, {
    body: {
      email: userJoinOutput.email,
      password: userPassword,
    },
  });
  // Registered user creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // Prepare image update payload
  const imageCount = randint(1, 5);
  const imagesToUpdateData = ArrayUtil.repeat(imageCount, (i) => ({
    imageUrl: `https://example.com/image_${i + 1}.jpg`,
    description:
      i % 2 === 0 ? RandomGenerator.paragraph({ sentences: 1 }) : null,
    displayOrder: i + 1,
  }));
  // Cast to IDiscussionBoardArticleImageRequest.Item[] to comply with API
  const imagesToUpdate = {
    data: imagesToUpdateData as (IDiscussionBoardArticleImageRequest.Item & {
      imageUrl: string;
      description?: string | null;
      displayOrder: number;
    })[],
  } satisfies IDiscussionBoardArticleImage.IRequest;
  // Call updateImages API
  const updateResponse =
    await api.functional.discussionBoard.administrator.articles.images.updateImages(
      adminConnection,
      {
        articleId: article.id,
        body: imagesToUpdate,
      },
    );
  // Assert and validate response
  const typedImages: IDiscussionBoardArticleImage[] = updateResponse.data.map(
    (item) => typia.assert<IDiscussionBoardArticleImage>(item),
  );
  TestValidator.equals(
    "updated images length",
    typedImages.length,
    imagesToUpdate.data.length,
  );
  for (let i = 0; i < imagesToUpdate.data.length; ++i) {
    TestValidator.equals(
      `image url at index ${i}`,
      typedImages[i].imageUrl,
      imagesToUpdate.data[i].imageUrl,
    );
    TestValidator.equals(
      `description at index ${i}`,
      typedImages[i].description ?? null,
      imagesToUpdate.data[i].description ?? null,
    );
    TestValidator.equals(
      `display order at index ${i}`,
      typedImages[i].displayOrder,
      imagesToUpdate.data[i].displayOrder,
    );
  }
  // Scenario 2: Authorization failure for non-admin
  await TestValidator.httpError(
    "non-admin update images forbidden",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.articles.images.updateImages(
        { host: connection.host },
        {
          articleId: article.id,
          body: imagesToUpdate,
        },
      );
    },
  );
  // Scenario 3: Update images for non-existing article
  const nonExistingArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "update images non-existing article returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.images.updateImages(
        adminConnection,
        {
          articleId: nonExistingArticleId,
          body: imagesToUpdate,
        },
      );
    },
  );
}
