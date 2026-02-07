import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_admin_articles_images_create";
import { generate_random_discussion_board_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_multiple_image_attachment_ordering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Create a section for testing
  const sectionId = typia.random<string>();
  // Create an article
  const article =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // Attach multiple images with different display_order values
  const image1 =
    await api.functional.discussionBoard.admin.articles.images.create(
      adminConnection,
      {
        articleId: (article as any).id,
        body: {
          ...typia.random<IDiscussionBoardArticleImage.ICreate>(),
          display_order: 0 satisfies number & tags.Type<"int32"> as number,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await api.functional.discussionBoard.admin.articles.images.create(
      adminConnection,
      {
        articleId: (article as any).id,
        body: {
          ...typia.random<IDiscussionBoardArticleImage.ICreate>(),
          display_order: 1 satisfies number & tags.Type<"int32"> as number,
        },
      },
    );
  typia.assert(image2);
  const image3 =
    await api.functional.discussionBoard.admin.articles.images.create(
      adminConnection,
      {
        articleId: (article as any).id,
        body: {
          ...typia.random<IDiscussionBoardArticleImage.ICreate>(),
          display_order: 2 satisfies number & tags.Type<"int32"> as number,
        },
      },
    );
  typia.assert(image3);
  // Verify image ordering - images should be stored with correct display_order values
  TestValidator.equals(
    "first image has display_order 0",
    (image1 as any).display_order,
    0,
  );
  TestValidator.equals(
    "second image has display_order 1",
    (image2 as any).display_order,
    1,
  );
  TestValidator.equals(
    "third image has display_order 2",
    (image3 as any).display_order,
    2,
  );
  // Verify sequential ordering
  TestValidator.predicate(
    "ordering is sequential",
    () =>
      (image1 as any).display_order < (image2 as any).display_order &&
      (image2 as any).display_order < (image3 as any).display_order,
  );
}
