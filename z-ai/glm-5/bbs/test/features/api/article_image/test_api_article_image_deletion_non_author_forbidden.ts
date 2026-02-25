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
 * Test verifies that a non-author user cannot delete another user's article images,
 * enforcing the authorization rule that only article authors and administrators can
 * perform this action.
 *
 * Setup: User A joins, creates an article, and attaches an image.
 * Then User B joins separately as a different authenticated user.
 * Execution: User B attempts to delete User A's image using the DELETE endpoint.
 * Expected result: 403 Forbidden error indicating authorization failure.
 * Validation: Verify User A's image still exists (can be retrieved).
 */
export async function test_api_article_image_deletion_non_author_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User A joins and creates an article with an image
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const article = await generate_random_discussion_board_user_articles_create(
    userAConnection,
    { body: {} },
  );
  typia.assert(article);
  const image =
    await generate_random_discussion_board_user_articles_images_create_image(
      userAConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(image);
  // Step 2: User B joins separately
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 3: User B attempts to delete User A's image - should fail with 403
  await TestValidator.httpError(
    "non-author cannot delete another user's image",
    403,
    async () => {
      await api.functional.discussionBoard.user.articles.images.erase(
        userBConnection,
        {
          articleId: article.id,
          imageId: image.id,
        },
      );
    },
  );
}
