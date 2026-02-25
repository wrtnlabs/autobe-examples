import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { generate_random_discussion_board_super_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_superadmin_article_images_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Step 2: Create test article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 3: Create multiple images with varied metadata for filtering
  const images = await Promise.all(
    ArrayUtil.repeat(10, async (index) => {
      const statusValues = [
        "active",
        "archived",
        "deleted",
        "uploaded",
        "processing",
      ] as const;
      const status = RandomGenerator.pick(statusValues);
      const displayOrder = index + 1;
      const altText = index % 3 === 0 ? `landscape photo ${index}` : null;
      const caption = index % 2 === 0 ? `sunset view ${index}` : null;
      return await generate_random_discussion_board_super_admin_articles_images_create(
        superAdminConnection,
        {
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            display_order: displayOrder satisfies number as number,
            alt_text: altText satisfies string | null as string | null,
            caption: caption satisfies string | null as string | null,
          } satisfies IDiscussionBoardArticleFile.ICreate,
          params: { articleId: article.id },
        },
      );
    }),
  );
  images.forEach((img) => typia.assert(img));
  // Step 4: Test status filtering
  const statusFilterResult =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          status: "active",
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(statusFilterResult);
  TestValidator.predicate(
    "active status filter returns only active images",
    statusFilterResult.data.every((img) => img.status === "active"),
  );
  // Step 5: Test display order range filtering
  const orderFilterResult =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          display_order: 5 satisfies number | null as number | null,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(orderFilterResult);
  TestValidator.predicate(
    "display order filter returns exact match",
    orderFilterResult.data.every((img) => img.display_order === 5),
  );
  // Step 6: Test text-based alt_text search
  const altTextFilterResult =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          alt_text: "landscape" satisfies string | null as string | null,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(altTextFilterResult);
  TestValidator.predicate(
    "alt_text search returns matching images",
    altTextFilterResult.data.every(
      (img) => img.alt_text !== null && img.alt_text.includes("landscape"),
    ),
  );
  // Step 7: Test text-based caption search
  const captionFilterResult =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          caption: "sunset" satisfies string | null as string | null,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(captionFilterResult);
  TestValidator.predicate(
    "caption search returns matching images",
    captionFilterResult.data.every(
      (img) => img.caption !== null && img.caption.includes("sunset"),
    ),
  );
  // Step 8: Test combination filter - status and alt_text
  const combinationFilterResult =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          status: "active",
          alt_text: "landscape" satisfies string | null as string | null,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(combinationFilterResult);
  TestValidator.predicate(
    "combination filter returns active images with landscape alt text",
    combinationFilterResult.data.every(
      (img) =>
        img.status === "active" &&
        img.alt_text !== null &&
        img.alt_text.includes("landscape"),
    ),
  );
  // Step 9: Verify pagination works with filters
  const paginatedResult =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          status: "active",
          page: 1 satisfies number | null as number | null,
          limit: 5 satisfies number | null as number | null,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination returns limited results",
    paginatedResult.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination metadata is correct",
    paginatedResult.pagination.limit === 5 &&
      paginatedResult.pagination.current === 1,
  );
  // Step 10: Test empty filter (should return all images)
  const allImagesResult =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(allImagesResult);
  TestValidator.predicate(
    "empty filter returns all images",
    allImagesResult.data.length > 0,
  );
}
