import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that a member can sort sections by different fields (created_at, name, updated_at)
 * in both ascending and descending order, and paginate through results with configurable
 * page sizes. The test creates multiple sections via admin to establish test data with
 * varying creation and update timestamps, then verifies sorting behavior: sorting by
 * created_at desc returns newest sections first, sorting by name asc returns alphabetically
 * ordered sections, sorting by updated_at desc returns most recently modified sections first.
 * Pagination tests verify that page numbers and limits are respected, with page sizes between
 * 1-100 items. The test validates that pagination metadata accurately reflects the current
 * page position, total record count, and total number of pages.
 */
export async function test_api_section_listing_member_sorts_and_paginates_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Setup: Create member account and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Create test sections via admin (5 sections with different names for sorting)
  const sectionNames = [
    "Alpha Section",
    "Beta Section",
    "Gamma Section",
    "Delta Section",
    "Epsilon Section",
  ];
  const sections: IDiscussionBoardSection[] = [];
  for (const name of sectionNames) {
    const section =
      await generate_random_discussion_board_admin_sections_create(
        adminConnection,
        {
          body: {
            name: name,
            description: `Description for ${name}`,
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);
  }
  // 4. Test sorting by created_at descending (newest first)
  const sortByCreatedAtDesc =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);
  TestValidator.equals(
    "created_at desc - first section should be newest",
    sortByCreatedAtDesc.data[0].id,
    sections[sections.length - 1].id,
  );
  // 5. Test sorting by name ascending (alphabetical)
  const sortByNameAsc =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          sort_by: "name",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(sortByNameAsc);
  TestValidator.equals(
    "name asc - first section should be Alpha",
    sortByNameAsc.data[0].name,
    "Alpha Section",
  );
  // 6. Test sorting by updated_at descending
  const sortByUpdatedAtDesc =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          sort_by: "updated_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(sortByUpdatedAtDesc);
  TestValidator.equals(
    "updated_at desc - should return all sections",
    sortByUpdatedAtDesc.data.length,
    sections.length,
  );
  // 7. Test pagination with page size 2
  const paginationPage1 =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(paginationPage1);
  TestValidator.equals(
    "pagination page 1 - limit",
    paginationPage1.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination page 1 - records",
    paginationPage1.pagination.records,
    sections.length,
  );
  TestValidator.equals(
    "pagination page 1 - pages",
    paginationPage1.pagination.pages,
    3,
  ); // ceil(5/2) = 3
  TestValidator.equals(
    "pagination page 1 - current",
    paginationPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination page 1 - data count",
    paginationPage1.data.length,
    2,
  );
  // 8. Test pagination page 2
  const paginationPage2 =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(paginationPage2);
  TestValidator.equals(
    "pagination page 2 - current",
    paginationPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination page 2 - data count",
    paginationPage2.data.length,
    2,
  );
  // 9. Test pagination page 3 (last page with 1 item)
  const paginationPage3 =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          page: 3,
          limit: 2,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(paginationPage3);
  TestValidator.equals(
    "pagination page 3 - current",
    paginationPage3.pagination.current,
    3,
  );
  TestValidator.equals(
    "pagination page 3 - data count",
    paginationPage3.data.length,
    1,
  );
  // 10. Test pagination with limit 100 (max allowed)
  const paginationLargeLimit =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(paginationLargeLimit);
  TestValidator.equals(
    "pagination limit 100 - limit",
    paginationLargeLimit.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination limit 100 - pages",
    paginationLargeLimit.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination limit 100 - data count",
    paginationLargeLimit.data.length,
    sections.length,
  );
}
