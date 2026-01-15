import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      href: `https://example.com/test-${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://referrer.com/theme-${RandomGenerator.alphaNumeric(8)}`,
      ip: null,
    },
  });
  // Step 2: Create a new article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    { body: {} },
  );
  // Step 3: Retrieve the article's images (it might not have any)
  const imageResponse =
    await api.functional.discussionBoard.member.articles.images.patchByArticlecode(
      memberConnection,
      {
        articleCode: article.code,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticleImage.IRequest,
      },
    );
  // Step 4: Validate the response structure using typia
  typia.assert(imageResponse);
  // Validate essential pagination values
  TestValidator.equals(
    "Pagination current is 1",
    imageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "Pagination limit is 20",
    imageResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "If no images, pagination records should be 0",
    imageResponse.pagination.records,
    0,
  );
  // Verify the data is an array
  TestValidator.equals(
    "Data should be an array of images",
    Array.isArray(imageResponse.data),
    true,
  );
  // Verify properties in the response (the existence type is already handled by typia)
  if (imageResponse.data.length > 0) {
    const firstImage = imageResponse.data[0];
    TestValidator.equals(
      "First image ID exists",
      firstImage.id !== undefined,
      true,
    );
    TestValidator.equals(
      "First image URL exists",
      firstImage.url !== undefined,
      true,
    );
    TestValidator.equals(
      "First image width exists",
      firstImage.width !== undefined,
      true,
    );
    TestValidator.equals(
      "First image height exists",
      firstImage.height !== undefined,
      true,
    );
    TestValidator.equals(
      "First image MIME type exists",
      firstImage.mime_type !== undefined,
      true,
    );
  }
}
