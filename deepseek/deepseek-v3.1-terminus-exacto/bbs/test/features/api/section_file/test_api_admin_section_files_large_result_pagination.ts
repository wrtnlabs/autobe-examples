import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionFile";
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
 * Test API for admin section files large result pagination
 */
export async function test_api_admin_section_files_large_result_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
  // 2. Create a section for testing
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Test pagination with different page sizes
  const pageSizes = [5, 10, 20] as const;
  for (const pageSize of pageSizes) {
    const limit = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >();
    const requestBody = {
      page: 1,
      limit: pageSize,
    } satisfies IDiscussionBoardSectionFile.IRequest;
    // Test first page
    const firstPage =
      await api.functional.discussionBoard.admin.sections.files.index(
        adminConnection,
        {
          sectionId: section.id,
          body: requestBody,
        },
      );
    typia.assert(firstPage);
    // Extract pagination data for easier access
    const pagination = firstPage.pagination.pagination.pagination.pagination;
    // Validate pagination metadata
    TestValidator.equals("first page current page", pagination.current, 1);
    TestValidator.equals("first page limit", pagination.limit, pageSize);
    TestValidator.predicate("first page records >= 0", pagination.records >= 0);
    TestValidator.predicate("first page pages >= 0", pagination.pages >= 0);
    // Test middle page
    if (pagination.pages > 1) {
      const middlePage =
        await api.functional.discussionBoard.admin.sections.files.index(
          adminConnection,
          {
            sectionId: section.id,
            body: {
              page: Math.min(2, pagination.pages),
              limit: pageSize,
            } satisfies IDiscussionBoardSectionFile.IRequest,
          },
        );
      typia.assert(middlePage);
      const middlePagination =
        middlePage.pagination.pagination.pagination.pagination;
      TestValidator.predicate(
        "middle page data valid",
        middlePage.data.length <= pageSize,
      );
      TestValidator.equals(
        "middle page correct page",
        middlePagination.current,
        Math.min(2, pagination.pages),
      );
    }
    // Test last page
    if (pagination.pages > 0) {
      const lastPage =
        await api.functional.discussionBoard.admin.sections.files.index(
          adminConnection,
          {
            sectionId: section.id,
            body: {
              page: pagination.pages,
              limit: pageSize,
            } satisfies IDiscussionBoardSectionFile.IRequest,
          },
        );
      typia.assert(lastPage);
      const lastPagination =
        lastPage.pagination.pagination.pagination.pagination;
      TestValidator.equals(
        "last page correct page",
        lastPagination.current,
        pagination.pages,
      );
      TestValidator.predicate(
        "last page data count <= limit",
        lastPage.data.length <= pageSize,
      );
    }
    // Test beyond last page - should handle gracefully
    const beyondLastPage =
      await api.functional.discussionBoard.admin.sections.files.index(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            page: pagination.pages + 1,
            limit: pageSize,
          } satisfies IDiscussionBoardSectionFile.IRequest,
        },
      );
    typia.assert(beyondLastPage);
    // Should handle gracefully - either empty results or last page bounded
    TestValidator.predicate(
      "beyond last page handles gracefully",
      beyondLastPage.data.length === 0 ||
        beyondLastPage.pagination.pagination.pagination.pagination.current <=
          pagination.pages,
    );
    // Test invalid page (page 0) - should handle gracefully
    const invalidPage =
      await api.functional.discussionBoard.admin.sections.files.index(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            page: 0,
            limit: pageSize,
          } satisfies IDiscussionBoardSectionFile.IRequest,
        },
      );
    typia.assert(invalidPage);
    // Should handle gracefully - typically defaults to page 1
    TestValidator.predicate(
      "invalid page handles gracefully",
      invalidPage.pagination.pagination.pagination.pagination.current >= 1,
    );
  }
  // 4. Test sequential page navigation
  const sequentialLimit = 10;
  let currentPage = 1;
  let totalSequentialItems = 0;
  while (currentPage <= 5) {
    // Limit to prevent infinite loops
    const page =
      await api.functional.discussionBoard.admin.sections.files.index(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            page: currentPage,
            limit: sequentialLimit,
          } satisfies IDiscussionBoardSectionFile.IRequest,
        },
      );
    typia.assert(page);
    // File validation is handled by typia.assert above
    // No manual type checking needed - typia.validate ensures all types are correct
    totalSequentialItems += page.data.length;
    // Stop if we've reached the last page or no more items
    if (
      currentPage >= page.pagination.pagination.pagination.pagination.pages ||
      page.data.length === 0
    ) {
      break;
    }
    currentPage++;
  }
  // Verify consistency with overall count
  const overallPage =
    await api.functional.discussionBoard.admin.sections.files.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(overallPage);
  TestValidator.predicate(
    "sequential navigation consistency",
    totalSequentialItems <=
      overallPage.pagination.pagination.pagination.pagination.records,
  );
}
