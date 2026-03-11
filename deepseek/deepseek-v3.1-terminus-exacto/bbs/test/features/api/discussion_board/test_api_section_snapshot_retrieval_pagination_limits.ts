import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
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
 * Test pagination functionality when retrieving section snapshots.
 * 1. Create an administrator account and authenticate
 * 2. Create a section (this creates the first snapshot)
 * 3. Test pagination with different page and limit parameters
 * 4. Verify pagination metadata calculations
 * 5. Test edge cases like page beyond total pages
 *
 * Note: Section snapshots are automatically created when sections are created.
 * Since we cannot generate additional snapshots through the available API,
 * we test with the single snapshot created during section creation.
 */
export async function test_api_section_snapshot_retrieval_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create section (this creates the first snapshot)
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Test pagination with default parameters (page 1, default limit)
  const firstPage =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  // Verify pagination metadata - expecting at least 1 snapshot (the initial creation)
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has at least one snapshot",
    firstPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    firstPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  // 4. Test specific page and limit
  const customPage =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(customPage);
  TestValidator.equals("custom page number", customPage.pagination.current, 1);
  TestValidator.equals("custom limit", customPage.pagination.limit, 5);
  TestValidator.equals(
    "total records consistent",
    customPage.pagination.records,
    firstPage.pagination.records,
  );
  // 5. Test edge case: page beyond total pages
  const beyondPage =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 100, // Far beyond actual pages
          limit: 10,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page current",
    beyondPage.pagination.current,
    100,
  );
  TestValidator.equals("beyond page limit", beyondPage.pagination.limit, 10);
  TestValidator.equals(
    "beyond page total records",
    beyondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.predicate(
    "beyond page has empty or reduced data",
    beyondPage.data.length <= 10,
  );
  TestValidator.predicate(
    "beyond page total pages correct",
    beyondPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / 10),
  );
}
