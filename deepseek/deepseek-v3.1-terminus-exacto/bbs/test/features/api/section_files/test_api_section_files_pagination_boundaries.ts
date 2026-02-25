import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_files_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_files_create";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_files_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create test section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Test Section " + RandomGenerator.alphabets(5),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create multiple files for pagination testing (15 files total)
  const fileCount = 15;
  const createdFiles: IDiscussionBoardArticleFile[] = [];
  for (let i = 0; i < fileCount; i++) {
    const file =
      await generate_random_discussion_board_super_admin_sections_files_create(
        superAdminConnection,
        {
          params: { sectionId: section.id },
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            display_order: i,
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            caption: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(file);
    createdFiles.push(file);
  }
  // 4. Test pagination boundaries and edge cases
  // Test 1: Default pagination (page=undefined, limit=undefined)
  const defaultPage =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {} satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default page returns data",
    defaultPage.data.length > 0,
  );
  TestValidator.predicate(
    "default limit is reasonable",
    defaultPage.pagination.pagination.pagination.pagination.limit > 0,
  );
  TestValidator.equals(
    "default current page is 1",
    defaultPage.pagination.pagination.pagination.pagination.current,
    1,
  );
  // Test 2: First page with explicit parameters
  const firstPage =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page page number",
    firstPage.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.pagination.pagination.pagination.limit,
    5,
  );
  TestValidator.equals("first page data count", firstPage.data.length, 5);
  TestValidator.equals(
    "first page total records",
    firstPage.pagination.pagination.pagination.pagination.records,
    fileCount,
  );
  TestValidator.equals(
    "first page total pages",
    firstPage.pagination.pagination.pagination.pagination.pages,
    Math.ceil(fileCount / 5),
  );
  // Test 3: Middle page
  const middlePage =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(middlePage);
  TestValidator.equals(
    "middle page page number",
    middlePage.pagination.pagination.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "middle page limit",
    middlePage.pagination.pagination.pagination.pagination.limit,
    5,
  );
  TestValidator.predicate("middle page has data", middlePage.data.length > 0);
  // Test 4: Last page (possibly partial)
  const lastPage =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: Math.ceil(fileCount / 5),
          limit: 5,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page page number",
    lastPage.pagination.pagination.pagination.pagination.current,
    Math.ceil(fileCount / 5),
  );
  TestValidator.predicate("last page data count", lastPage.data.length <= 5);
  TestValidator.predicate("last page may be partial", lastPage.data.length > 0);
  // Test 5: Page beyond available records (should return empty data)
  const beyondPage =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: Math.ceil(fileCount / 5) + 2,
          limit: 5,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page has no data", beyondPage.data.length, 0);
  TestValidator.predicate(
    "beyond page page number is valid",
    beyondPage.pagination.pagination.pagination.pagination.current >
      Math.ceil(fileCount / 5),
  );
  // Test 6: Page=0 (should behave as default page 1)
  const pageZero =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 0,
          limit: 10,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(pageZero);
  TestValidator.predicate(
    "page=0 uses default page",
    pageZero.pagination.pagination.pagination.pagination.current >= 1,
  );
  TestValidator.predicate("page=0 returns data", pageZero.data.length > 0);
  // Test 7: Excessive limit value (should cap at maximum)
  const excessiveLimit =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 200, // Beyond maximum of 100
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(excessiveLimit);
  TestValidator.predicate(
    "excessive limit is capped",
    excessiveLimit.pagination.pagination.pagination.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "capped limit is reasonable",
    excessiveLimit.pagination.pagination.pagination.pagination.limit > 0,
  );
  // Test 8: Verify data integrity across paginated results
  const allFiles: IDiscussionBoardSectionFile.ISummary[] = [];
  for (
    let pageNum = 1;
    pageNum <= firstPage.pagination.pagination.pagination.pagination.pages;
    pageNum++
  ) {
    const pageResult =
      await api.functional.discussionBoard.superAdmin.sections.files.index(
        superAdminConnection,
        {
          sectionId: section.id,
          body: {
            page: pageNum,
            limit: 5,
          } satisfies IDiscussionBoardSectionFile.IRequest,
        },
      );
    typia.assert(pageResult);
    allFiles.push(...pageResult.data);
  }
  TestValidator.equals(
    "total paginated files match created files",
    allFiles.length,
    fileCount,
  );
  // Test 9: Empty section test
  const emptySection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Empty Section " + RandomGenerator.alphabets(5),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(emptySection);
  const emptyResult =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: emptySection.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty section data count", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty section records",
    emptyResult.pagination.pagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty section pages",
    emptyResult.pagination.pagination.pagination.pagination.pages,
    0,
  );
}
