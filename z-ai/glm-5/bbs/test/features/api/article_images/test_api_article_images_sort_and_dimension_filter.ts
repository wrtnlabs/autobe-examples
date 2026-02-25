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

/**
 * Test sorting options and dimension-based filtering with pagination for article images.
 *
 * Test Flow:
 * 1. Authenticate as a user via join endpoint
 * 2. Create an article with images of various dimensions (width/height) and file sizes
 * 3. Test sorting by file_size descending
 * 4. Test dimension filtering by width range (min_width, max_width)
 * 5. Test dimension filtering by height range (min_height, max_height)
 * 6. Test pagination with page and limit parameters
 * 7. Verify pagination metadata accuracy
 */
export async function test_api_article_images_sort_and_dimension_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an article with images of various dimensions
  const images: IDiscussionBoardArticleImage.ICreate[] = [
    {
      original_filename: "small.jpg",
      storage_path: "https://example.com/images/small.jpg",
      file_size: 100000,
      mime_type: "image/jpeg",
      width: 100,
      height: 100,
    },
    {
      original_filename: "medium.png",
      storage_path: "https://example.com/images/medium.png",
      file_size: 500000,
      mime_type: "image/png",
      width: 500,
      height: 500,
    },
    {
      original_filename: "large.jpg",
      storage_path: "https://example.com/images/large.jpg",
      file_size: 2000000,
      mime_type: "image/jpeg",
      width: 2000,
      height: 1500,
    },
    {
      original_filename: "wide.jpg",
      storage_path: "https://example.com/images/wide.jpg",
      file_size: 1500000,
      mime_type: "image/jpeg",
      width: 3000,
      height: 500,
    },
    {
      original_filename: "tall.png",
      storage_path: "https://example.com/images/tall.png",
      file_size: 1800000,
      mime_type: "image/png",
      width: 500,
      height: 3000,
    },
  ];
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        images,
      },
    },
  );
  typia.assert(article);
  // 3. Test sorting by file_size descending
  const sortedImages =
    await api.functional.discussionBoard.articles.images.index(userConnection, {
      articleId: article.id,
      body: {
        sort: "-file_size",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedImages);
  // Verify descending order by file_size
  const fileSizes = sortedImages.data.map((img) => img.file_size);
  for (let i = 0; i < fileSizes.length - 1; i++) {
    TestValidator.predicate(
      `file_size descending at index ${i}`,
      fileSizes[i] >= fileSizes[i + 1],
    );
  }
  // 4. Test dimension filtering - width between 400 and 600
  const filteredByWidth =
    await api.functional.discussionBoard.articles.images.index(userConnection, {
      articleId: article.id,
      body: {
        min_width: 400,
        max_width: 600,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(filteredByWidth);
  // Verify width filter - all images should have width in range [400, 600]
  for (const img of filteredByWidth.data) {
    TestValidator.predicate(
      `width ${img.width} in range [400, 600]`,
      img.width >= 400 && img.width <= 600,
    );
  }
  // 5. Test dimension filtering - height between 100 and 1000
  const filteredByHeight =
    await api.functional.discussionBoard.articles.images.index(userConnection, {
      articleId: article.id,
      body: {
        min_height: 100,
        max_height: 1000,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(filteredByHeight);
  // Verify height filter - all images should have height in range [100, 1000]
  for (const img of filteredByHeight.data) {
    TestValidator.predicate(
      `height ${img.height} in range [100, 1000]`,
      img.height >= 100 && img.height <= 1000,
    );
  }
  // 6. Test pagination with limit
  const paginatedImages =
    await api.functional.discussionBoard.articles.images.index(userConnection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(paginatedImages);
  // Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    paginatedImages.pagination.current,
    1,
  );
  TestValidator.equals("limit is 2", paginatedImages.pagination.limit, 2);
  TestValidator.predicate(
    "data length within limit",
    paginatedImages.data.length <= 2,
  );
  TestValidator.predicate(
    "total records >= returned data",
    paginatedImages.pagination.records >= paginatedImages.data.length,
  );
  TestValidator.predicate(
    "pages count is calculated correctly",
    paginatedImages.pagination.pages ===
      Math.ceil(
        paginatedImages.pagination.records / paginatedImages.pagination.limit,
      ),
  );
}
