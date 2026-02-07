import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_file_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authorize super admin
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a section using utility function
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {},
    );
  typia.assert(section);
  // Test 1: Search for non-existent file type
  const search1 =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          file_type: "non_existent_file_type",
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(search1);
  TestValidator.equals(
    "empty results for non-existent file type",
    search1.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-existent file type",
    search1.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent file type",
    search1.pagination.pages,
    0,
  );
  // Test 2: Search with specific description that doesn't match any files
  const search2 =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          description: "this_description_does_not_exist_in_any_file",
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(search2);
  TestValidator.equals(
    "empty results for non-matching description",
    search2.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-matching description",
    search2.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-matching description",
    search2.pagination.pages,
    0,
  );
  // Test 3: Search with combination of filters that guarantee no results
  const search3 =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          file_type: "imaginary_file_format",
          description: "nonexistent_description_pattern",
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(search3);
  TestValidator.equals(
    "empty results for combined filters",
    search3.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for combined filters",
    search3.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for combined filters",
    search3.pagination.pages,
    0,
  );
}
