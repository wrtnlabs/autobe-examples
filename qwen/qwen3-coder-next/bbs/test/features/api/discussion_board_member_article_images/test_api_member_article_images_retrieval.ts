import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_images_create } from "../../../generate/generate_random_discussion_board_member_articles_images_create";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test retrieval of article images for a member.
 * Validates the complete workflow: authentication, article creation,
 * image upload, and image retrieval with pagination structure.
 */
export async function test_api_member_article_images_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(authResult);
  // 2. Generate a random article ID (since IDiscussionBoardArticle has no id property)
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Upload multiple images to the article (simulated)
  const image1 =
    await generate_random_discussion_board_member_articles_images_create(
      memberConnection,
      {
        body: {},
        params: {
          articleId: articleId,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_discussion_board_member_articles_images_create(
      memberConnection,
      {
        body: {},
        params: {
          articleId: articleId,
        },
      },
    );
  typia.assert(image2);
  // 4. Retrieve images
  const result: IPageIDiscussionBoardArticleImage.ISummary =
    await api.functional.discussionBoard.member.articles.images.index(
      memberConnection,
      {
        articleId: articleId,
      },
    );
  typia.assert(result);
  // 5. Validate basic structure
  TestValidator.equals("has data array", Array.isArray(result.data), true);
  TestValidator.equals("has pagination", !!result.pagination, true);
  // 6. Validate pagination structure (using IPage.IPagination properties)
  TestValidator.predicate(
    "pagination has current page",
    () => typeof result.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    () => typeof result.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records count",
    () => typeof result.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    () => typeof result.pagination.pages === "number",
  );
  // 7. Validate data array size matches records count
  TestValidator.equals(
    "data array size matches records",
    result.data.length,
    result.pagination.records,
  );
  // 8. Validate pagination totals
  TestValidator.equals(
    "records matches data length",
    result.pagination.records,
    result.data.length,
  );
  TestValidator.predicate("pages >= 1", () => result.pagination.pages >= 1);
  TestValidator.predicate("limit > 0", () => result.pagination.limit > 0);
}
