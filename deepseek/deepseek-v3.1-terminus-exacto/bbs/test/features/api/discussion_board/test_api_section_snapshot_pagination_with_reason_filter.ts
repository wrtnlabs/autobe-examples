import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
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

export async function test_api_section_snapshot_pagination_with_reason_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a test section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Test pagination with different page sizes
  const pageSizes = [1, 3, 5] as const;
  for (const limit of pageSizes) {
    const paginationResponse =
      await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
        superAdminConnection,
        {
          sectionId: section.id,
          body: {
            page: 1,
            limit: limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IDiscussionBoardSectionSnapshot.IRequest,
        },
      );
    typia.assert(paginationResponse);
    // Validate pagination metadata structure
    TestValidator.equals(
      `page ${limit} current page`,
      paginationResponse.pagination.current,
      1,
    );
    TestValidator.equals(
      `page ${limit} limit`,
      paginationResponse.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `page ${limit} records >= 0`,
      paginationResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page ${limit} pages >= 0`,
      paginationResponse.pagination.pages >= 0,
    );
    // Validate data length matches limit (or less if fewer records exist)
    TestValidator.predicate(
      `page ${limit} data length <= limit`,
      paginationResponse.data.length <= limit,
    );
  }
  // 4. Test filtering by different snapshot reasons (including null)
  const testReasons = [
    "administrative update",
    "compliance audit",
    null,
  ] as const;
  for (const reason of testReasons) {
    const filteredResponse =
      await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
        superAdminConnection,
        {
          sectionId: section.id,
          body: {
            snapshot_reason: reason,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSectionSnapshot.IRequest,
        },
      );
    typia.assert(filteredResponse);
    // Validate all returned snapshots match the filter reason (if any exist)
    for (const snapshot of filteredResponse.data) {
      TestValidator.equals(
        `snapshot reason filter '${reason}' matches`,
        snapshot.snapshot_reason,
        reason,
      );
    }
    // Validate pagination metadata is consistent
    TestValidator.predicate(
      `filter '${reason}' records count consistent`,
      filteredResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      `filter '${reason}' pages count consistent`,
      filteredResponse.pagination.pages >= 0,
    );
  }
  // 5. Test pagination with filtered results
  const filteredPaginationResponse =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          snapshot_reason: "administrative update",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(filteredPaginationResponse);
  // Validate filtered pagination metadata
  TestValidator.equals(
    "filtered pagination current page",
    filteredPaginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered pagination limit",
    filteredPaginationResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "filtered pagination records >= 0",
    filteredPaginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pagination pages >= 0",
    filteredPaginationResponse.pagination.pages >= 0,
  );
  // Validate all filtered results match the reason (if any exist)
  for (const snapshot of filteredPaginationResponse.data) {
    TestValidator.equals(
      "filtered snapshot reason matches",
      snapshot.snapshot_reason,
      "administrative update",
    );
  }
  // 6. Test pagination calculation consistency
  // Verify that pages = ceil(records / limit) when records > 0
  const consistencyTest =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(consistencyTest);
  if (consistencyTest.pagination.records > 0) {
    const expectedPages = Math.ceil(
      consistencyTest.pagination.records / consistencyTest.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation correct",
      consistencyTest.pagination.pages,
      expectedPages,
    );
  }
}
