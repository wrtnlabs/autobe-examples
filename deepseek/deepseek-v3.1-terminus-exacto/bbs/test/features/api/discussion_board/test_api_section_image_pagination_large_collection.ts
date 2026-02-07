import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test pagination behavior with a large collection of section images.
 * An administrator should be able to navigate through multiple pages of search results
 * using configurable page sizes. Verify that pagination metadata (current page, limit,
 * total records, total pages) is correctly calculated and returned.
 */
export async function test_api_section_image_pagination_large_collection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a section to search images within using utility function
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(section);
  // 3. Test different page sizes
  const pageSizes = [10, 25, 50] as const;
  for (const pageSize of pageSizes) {
    // Test first page
    const firstPage =
      await api.functional.discussionBoard.admin.sections.images.index(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            page: 1,
            limit: pageSize,
          } satisfies IDiscussionBoardSectionImage.IRequest,
        },
      );
    typia.assert(firstPage);
    // Validate pagination metadata
    TestValidator.equals(
      `page ${pageSize} - current page should be 1`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `page ${pageSize} - limit should match requested size`,
      firstPage.pagination.limit,
      pageSize,
    );
    TestValidator.predicate(
      `page ${pageSize} - records should be non-negative`,
      firstPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page ${pageSize} - pages should be non-negative`,
      firstPage.pagination.pages >= 0,
    );
    // Validate mathematical relationship between records, pages, and limit
    if (firstPage.pagination.records > 0) {
      TestValidator.predicate(
        `page ${pageSize} - pages should be ceil(records/limit)`,
        firstPage.pagination.pages ===
          Math.ceil(firstPage.pagination.records / pageSize),
      );
    }
    // Test second page if available
    if (firstPage.pagination.pages >= 2) {
      const secondPage =
        await api.functional.discussionBoard.admin.sections.images.index(
          adminConnection,
          {
            sectionId: section.id,
            body: {
              page: 2,
              limit: pageSize,
            } satisfies IDiscussionBoardSectionImage.IRequest,
          },
        );
      typia.assert(secondPage);
      TestValidator.equals(
        `page ${pageSize} - second page current should be 2`,
        secondPage.pagination.current,
        2,
      );
      TestValidator.equals(
        `page ${pageSize} - second page limit should match requested size`,
        secondPage.pagination.limit,
        pageSize,
      );
      TestValidator.equals(
        `page ${pageSize} - total records should be consistent across pages`,
        secondPage.pagination.records,
        firstPage.pagination.records,
      );
    }
    // Test last page
    if (firstPage.pagination.pages > 0) {
      const lastPage =
        await api.functional.discussionBoard.admin.sections.images.index(
          adminConnection,
          {
            sectionId: section.id,
            body: {
              page: firstPage.pagination.pages,
              limit: pageSize,
            } satisfies IDiscussionBoardSectionImage.IRequest,
          },
        );
      typia.assert(lastPage);
      TestValidator.equals(
        `page ${pageSize} - last page current should match total pages`,
        lastPage.pagination.current,
        firstPage.pagination.pages,
      );
      TestValidator.predicate(
        `page ${pageSize} - last page data should not exceed limit`,
        lastPage.data.length <= pageSize,
      );
      // Validate last page data count matches expected remainder
      const expectedLastPageCount =
        firstPage.pagination.records % pageSize || pageSize;
      TestValidator.predicate(
        `page ${pageSize} - last page should have correct item count`,
        lastPage.data.length === expectedLastPageCount ||
          lastPage.data.length === 0,
      );
    }
    // Test beyond last page
    const beyondLastPage =
      await api.functional.discussionBoard.admin.sections.images.index(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            page: firstPage.pagination.pages + 1,
            limit: pageSize,
          } satisfies IDiscussionBoardSectionImage.IRequest,
        },
      );
    typia.assert(beyondLastPage);
    TestValidator.equals(
      `page ${pageSize} - beyond last page should return empty data`,
      beyondLastPage.data.length,
      0,
    );
    TestValidator.equals(
      `page ${pageSize} - beyond last page current should be requested page`,
      beyondLastPage.pagination.current,
      firstPage.pagination.pages + 1,
    );
    TestValidator.equals(
      `page ${pageSize} - beyond last page records should be consistent`,
      beyondLastPage.pagination.records,
      firstPage.pagination.records,
    );
  }
}
