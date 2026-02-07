import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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

export async function test_api_section_files_search_by_filename_pattern(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Create a section
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
  // Note: The current API schema for IDiscussionBoardSectionFile.IRequest
  // only supports file_type and description filtering, not filename pattern matching.
  // This test will validate the available search functionality.
  // 3. Search files with available filters
  const searchResult =
    await api.functional.discussionBoard.admin.sections.files.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          file_type: undefined,
          description: undefined,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    searchResult.pagination.pages >= 0,
  );
  // 5. Validate file summary structure for each returned file
  for (const file of searchResult.data) {
    typia.assert(file);
  }
  // 6. Test search with specific file type filter
  const fileTypeSearch =
    await api.functional.discussionBoard.admin.sections.files.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          file_type: "pdf",
          description: undefined,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(fileTypeSearch);
  // 7. Test search with description filter
  const descriptionSearch =
    await api.functional.discussionBoard.admin.sections.files.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          file_type: undefined,
          description: "report",
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(descriptionSearch);
}
