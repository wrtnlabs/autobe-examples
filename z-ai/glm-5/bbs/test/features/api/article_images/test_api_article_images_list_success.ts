import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_images_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an article with 5 image attachments of various formats
  const mimeTypes: IDiscussionBoardArticleImage.ISummary["mime_type"][] = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/jpeg",
    "image/png",
  ];
  const images: IDiscussionBoardArticleImage.ICreate[] = ArrayUtil.repeat(
    5,
    (index) =>
      ({
        original_filename: `image_${index + 1}.${mimeTypes[index] === "image/jpeg" ? "jpg" : mimeTypes[index] === "image/png" ? "png" : "gif"}`,
        storage_path: `https://storage.example.com/images/${typia.random<string & tags.Format<"uuid">>()}`,
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
        mime_type: mimeTypes[index],
        width: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<2000>
        >(),
        height: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<2000>
        >(),
      }) satisfies IDiscussionBoardArticleImage.ICreate,
  );
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        images,
      },
    },
  );
  typia.assert(article);
  // 3. Call the images index endpoint
  const imagesPage = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {} satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(imagesPage);
  // 4. Verify all 5 images are returned
  TestValidator.equals("image count", imagesPage.data.length, 5);
  // 5. Validate each image has correct metadata structure
  for (const image of imagesPage.data) {
    typia.assert<IDiscussionBoardArticleImage.ISummary>(image);
  }
  // 6. Verify images are sorted by created_at ascending (oldest first)
  const sortedCorrectly = imagesPage.data.every(
    (image, index) =>
      index === 0 ||
      new Date(imagesPage.data[index - 1].created_at) <=
        new Date(image.created_at),
  );
  TestValidator.predicate(
    "images sorted by created_at ascending",
    sortedCorrectly,
  );
  // 7. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    imagesPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    imagesPage.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination total records",
    imagesPage.pagination.records,
    5,
  );
  TestValidator.predicate(
    "pagination total pages is positive",
    imagesPage.pagination.pages > 0,
  );
}
