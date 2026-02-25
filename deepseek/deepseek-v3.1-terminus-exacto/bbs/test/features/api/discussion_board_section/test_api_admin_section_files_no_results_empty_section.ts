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

export async function test_api_admin_section_files_no_results_empty_section(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a clean test section with no files
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Test 1: Search files with empty request (default filters)
  const emptySearch =
    await api.functional.discussionBoard.admin.sections.files.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {} satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should have empty data array",
    emptySearch.data.length,
    0,
  );
  // Test 2: Search with non-existent filename filter
  const filenameSearch =
    await api.functional.discussionBoard.admin.sections.files.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          filename: "non_existent_file.pdf",
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(filenameSearch);
  TestValidator.equals(
    "filename search should have empty data array",
    filenameSearch.data.length,
    0,
  );
  // Test 3: Search with non-existent file type filter
  const fileTypeSearch =
    await api.functional.discussionBoard.admin.sections.files.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          file_type: "application/non-existent-type",
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(fileTypeSearch);
  TestValidator.equals(
    "file type search should have empty data array",
    fileTypeSearch.data.length,
    0,
  );
  // Test 4: Search with file size range filter
  const sizeRangeSearch =
    await api.functional.discussionBoard.admin.sections.files.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          file_size_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1024>
          >(),
          file_size_max: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<2048>
          >(),
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(sizeRangeSearch);
  TestValidator.equals(
    "size range search should have empty data array",
    sizeRangeSearch.data.length,
    0,
  );
  // Test 5: Search with description filter
  const descriptionSearch =
    await api.functional.discussionBoard.admin.sections.files.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          description: "non-existent description text",
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(descriptionSearch);
  TestValidator.equals(
    "description search should have empty data array",
    descriptionSearch.data.length,
    0,
  );
  // Test 6: Search with pagination parameters
  const paginatedSearch =
    await api.functional.discussionBoard.admin.sections.files.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "paginated search should have empty data array",
    paginatedSearch.data.length,
    0,
  );
}
