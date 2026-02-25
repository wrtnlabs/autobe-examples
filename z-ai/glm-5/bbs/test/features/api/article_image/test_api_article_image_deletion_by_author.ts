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

export async function test_api_article_image_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as user who will create article and delete image
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create article that will have image attached
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Attach image to the article for deletion testing
  const image =
    await generate_random_discussion_board_user_articles_images_create_image(
      userConnection,
      {
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(image);
  // 4. Delete the image
  await api.functional.discussionBoard.user.articles.images.erase(
    userConnection,
    {
      articleId: article.id,
      imageId: image.id,
    },
  );
  // 5. Verify the image is deleted by fetching the article and checking images array
  // Note: The erase endpoint returns void, so we verify by checking the article no longer has the image
  // Since there's no GET endpoint for individual images, we rely on the successful completion of delete
  // and the fact that trying to delete again would fail (image doesn't exist)
  await TestValidator.error("image already deleted", async () => {
    await api.functional.discussionBoard.user.articles.images.erase(
      userConnection,
      {
        articleId: article.id,
        imageId: image.id,
      },
    );
  });
}
