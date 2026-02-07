import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleImageFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_images_create } from "../../../generate/generate_random_discussion_board_user_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_image_update_workflow_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article - using utility function which handles section validation internally
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // Utility function handles validation
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Upload an image to the article - using utility function which handles file validation internally
  const image =
    await generate_random_discussion_board_user_articles_images_create(
      userConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(), // Utility function handles validation
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(image);
  // Validate initial image status (utility functions set appropriate defaults)
  TestValidator.predicate(
    "initial image should have valid status",
    image.status === "uploaded" ||
      image.status === "active" ||
      image.status === "processing",
  );
  // Test status transitions using available workflow states
  const validStatuses = ["active", "archived", "deleted"] as const;
  for (const newStatus of validStatuses) {
    const updatedImage =
      await api.functional.discussionBoard.user.articles.images.update(
        userConnection,
        {
          articleId: article.id,
          imageId: image.id,
          body: {
            status: newStatus,
          } satisfies IDiscussionBoardArticleImage.IUpdate,
        },
      );
    typia.assert(updatedImage);
    TestValidator.equals(
      `status should be ${newStatus}`,
      updatedImage.status,
      newStatus,
    );
  }
  // Test updating other properties while maintaining the final status
  const finalImage =
    await api.functional.discussionBoard.user.articles.images.update(
      userConnection,
      {
        articleId: article.id,
        imageId: image.id,
        body: {
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleImage.IUpdate,
      },
    );
  typia.assert(finalImage);
  TestValidator.equals(
    "status should remain deleted",
    finalImage.status,
    "deleted",
  );
  TestValidator.notEquals(
    "display order should change",
    finalImage.display_order,
    image.display_order,
  );
}
