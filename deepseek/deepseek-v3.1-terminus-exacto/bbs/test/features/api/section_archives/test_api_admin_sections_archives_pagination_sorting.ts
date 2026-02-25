import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sections_archives_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
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
  // Test pagination with different page sizes
  const testCases = [
    { page: 1, limit: 10 },
    { page: 1, limit: 25 },
    { page: 1, limit: 50 },
    { page: 2, limit: 10 },
    { page: 3, limit: 5 },
  ];
  for (const testCase of testCases) {
    const response =
      await api.functional.discussionBoard.admin.sections.archives.index(
        adminConnection,
        {
          body: {
            page: testCase.page,
            limit: testCase.limit,
          } satisfies IDiscussionBoardSectionArchive.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      `pagination page ${testCase.page} limit ${testCase.limit}`,
      response.pagination.pagination.pagination.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `pagination limit ${testCase.page} limit ${testCase.limit}`,
      response.pagination.pagination.pagination.pagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      `pagination pages >= 0 ${testCase.page} limit ${testCase.limit}`,
      response.pagination.pagination.pagination.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `pagination records >= 0 ${testCase.page} limit ${testCase.limit}`,
      response.pagination.pagination.pagination.pagination.records >= 0,
    );
    TestValidator.predicate(
      `data array length <= limit ${testCase.page} limit ${testCase.limit}`,
      response.data.length <= testCase.limit,
    );
  }
  // Test sorting options
  const sortOptions = [
    "archived_at_desc",
    "archived_at_asc",
    "reason_asc",
    "reason_desc",
  ] as const;
  for (const sortOption of sortOptions) {
    const response =
      await api.functional.discussionBoard.admin.sections.archives.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            sort: sortOption,
          } satisfies IDiscussionBoardSectionArchive.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      `sort option ${sortOption} returns data`,
      typeof response.pagination.pagination.pagination.pagination.records,
      "number",
    );
  }
  // Test boundary conditions
  const boundaryCases = [
    { page: 0, limit: 10 }, // Should default to page 1
    { page: 999999, limit: 10 }, // Page beyond total records
    { page: 1, limit: 101 }, // Limit beyond maximum (should cap at 100)
  ];
  for (const boundaryCase of boundaryCases) {
    const response =
      await api.functional.discussionBoard.admin.sections.archives.index(
        adminConnection,
        {
          body: {
            page: boundaryCase.page,
            limit: boundaryCase.limit,
          } satisfies IDiscussionBoardSectionArchive.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination meta is valid
    TestValidator.predicate(
      `boundary case page ${boundaryCase.page} limit ${boundaryCase.limit}`,
      response.pagination.pagination.pagination.pagination.current >= 1 &&
        response.pagination.pagination.pagination.pagination.limit <= 100,
    );
  }
  // Test edge case with empty results using extreme filters
  const emptyResults =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        body: {
          reason: "nonexistent_reason_pattern_that_will_not_match_anything",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "empty results data array length",
    emptyResults.data.length,
    0,
  );
  TestValidator.predicate(
    "empty results pagination is valid",
    emptyResults.pagination.pagination.pagination.pagination.records === 0 &&
      emptyResults.pagination.pagination.pagination.pagination.pages === 0,
  );
}
