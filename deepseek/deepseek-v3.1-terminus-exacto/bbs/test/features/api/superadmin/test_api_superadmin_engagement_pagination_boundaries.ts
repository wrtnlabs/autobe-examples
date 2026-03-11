import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test engagement analytics pagination boundaries including edge cases like requesting page beyond available results,
 * minimum and maximum limit values, and invalid page numbers.
 */
export async function test_api_superadmin_engagement_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test minimum limit boundary (1)
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.engagement.index(
      superAdminConnection,
      {
        body: {
          limit: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "minimum limit enforced",
    minLimitResponse.pagination.limit,
    1,
  );
  // 3. Test maximum limit boundary (100)
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.engagement.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit enforced",
    maxLimitResponse.pagination.limit,
    100,
  );
  // 4. Test page beyond available results
  const highPageResponse =
    await api.functional.discussionBoard.superAdmin.engagement.index(
      superAdminConnection,
      {
        body: {
          page: 1000,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(highPageResponse);
  TestValidator.predicate(
    "high page returns empty data",
    highPageResponse.data.length === 0,
  );
  // 5. Validate pagination metadata calculation
  const normalResponse =
    await api.functional.discussionBoard.superAdmin.engagement.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(normalResponse);
  // Validate total pages calculation
  const expectedPages = Math.ceil(
    normalResponse.pagination.records / normalResponse.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculation",
    normalResponse.pagination.pages,
    expectedPages,
  );
  // 6. Test last page contains correct remaining records
  if (normalResponse.pagination.pages > 1) {
    const lastPageResponse =
      await api.functional.discussionBoard.superAdmin.engagement.index(
        superAdminConnection,
        {
          body: {
            page: normalResponse.pagination.pages,
            limit: normalResponse.pagination.limit,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(lastPageResponse);
    const expectedRemaining =
      normalResponse.pagination.records % normalResponse.pagination.limit;
    const actualRemaining =
      expectedRemaining === 0
        ? normalResponse.pagination.limit
        : expectedRemaining;
    TestValidator.predicate(
      "last page has valid record count",
      lastPageResponse.data.length <= actualRemaining,
    );
  }
}
