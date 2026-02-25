import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_images_admin_filter_by_status_and_display_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create an article as prerequisite
  const article = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Test image filtering with multiple criteria
  const filterCriteria: IDiscussionBoardArticleFile.IRequest = {
    status: "active",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
    alt_text: "test image",
    caption: "test caption",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleFile.IRequest;
  const filteredImages =
    await api.functional.discussionBoard.admin.articles.images.index(
      adminConnection,
      {
        articleId: article.id,
        body: filterCriteria,
      },
    );
  typia.assert(filteredImages);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    filteredImages.pagination !== undefined,
  );
  TestValidator.equals("current page", filteredImages.pagination.current, 1);
  TestValidator.equals("limit", filteredImages.pagination.limit, 10);
  TestValidator.predicate(
    "records count valid",
    filteredImages.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    filteredImages.pagination.pages >= 0,
  );
  // 5. Validate each image summary structure
  for (const image of filteredImages.data) {
    TestValidator.predicate("image has id", image.id !== undefined);
    TestValidator.predicate("image has status", image.status !== undefined);
    TestValidator.predicate(
      "image has display_order",
      image.display_order !== undefined,
    );
    TestValidator.predicate("image has alt_text", image.alt_text !== null);
    TestValidator.predicate("image has caption", image.caption !== null);
  }
  // 6. Test empty filter scenario
  const emptyFilter: IDiscussionBoardArticleFile.IRequest = {
    status: null,
    display_order: null,
    alt_text: null,
    caption: null,
  } satisfies IDiscussionBoardArticleFile.IRequest;
  const allImages =
    await api.functional.discussionBoard.admin.articles.images.index(
      adminConnection,
      {
        articleId: article.id,
        body: emptyFilter,
      },
    );
  typia.assert(allImages);
  // 7. Validate that filtering works by comparing results
  if (filteredImages.data.length > 0 && allImages.data.length > 0) {
    TestValidator.predicate(
      "filtered results should be subset or equal to all images",
      filteredImages.data.length <= allImages.data.length,
    );
  }
}
