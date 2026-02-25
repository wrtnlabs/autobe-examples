import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_user_articles_images_create_image } from "../../../generate/generate_random_discussion_board_user_articles_images_create_image";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test that the system enforces the maximum of 20 images per article limit.
 *
 * Workflow:
 * 1. Register a new user via join endpoint
 * 2. Create a new article owned by this user
 * 3. Attach 20 images successfully
 * 4. Attempt to attach a 21st image (should fail with IMAGE_COUNT_EXCEEDED)
 */
export async function test_api_article_image_count_limit_exceeded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an article without images
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        images: [],
      },
    },
  );
  typia.assert(article);
  // 3. Attach 20 images successfully
  const images = await ArrayUtil.asyncRepeat(20, async (index) => {
    const image =
      await generate_random_discussion_board_user_articles_images_create_image(
        userConnection,
        {
          params: { articleId: article.id },
          body: {
            original_filename: `image_${index}.png`,
            storage_path: typia.random<string & tags.Format<"uri">>(),
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<5242880>
            >(),
            mime_type: "image/png",
            width: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<8000>
            >(),
            height: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<8000>
            >(),
          } satisfies IDiscussionBoardArticleImage.ICreate,
        },
      );
    typia.assert(image);
    return image;
  });
  TestValidator.equals("20 images attached", images.length, 20);
  // 4. Attempt to attach 21st image - should fail
  await TestValidator.httpError(
    "21st image should fail with IMAGE_COUNT_EXCEEDED",
    400,
    async () => {
      await generate_random_discussion_board_user_articles_images_create_image(
        userConnection,
        {
          params: { articleId: article.id },
          body: {
            original_filename: "image_21.png",
            storage_path: typia.random<string & tags.Format<"uri">>(),
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<5242880>
            >(),
            mime_type: "image/png",
            width: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<8000>
            >(),
            height: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<8000>
            >(),
          } satisfies IDiscussionBoardArticleImage.ICreate,
        },
      );
    },
  );
}
