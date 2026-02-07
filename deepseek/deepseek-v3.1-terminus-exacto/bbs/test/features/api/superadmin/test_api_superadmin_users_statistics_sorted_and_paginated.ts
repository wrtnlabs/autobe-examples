import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_users_statistics_sorted_and_paginated(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test sorting by article_count descending
  const articleCountDesc =
    await api.functional.discussionBoard.superAdmin.users.statistics.index(
      superAdminConnection,
      {
        body: {
          sort_by: "article_count",
          sort_order: "desc",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(articleCountDesc);
  // Test sorting by comment_count ascending
  const commentCountAsc =
    await api.functional.discussionBoard.superAdmin.users.statistics.index(
      superAdminConnection,
      {
        body: {
          sort_by: "comment_count",
          sort_order: "asc",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(commentCountAsc);
  // Test sorting by last_activity descending
  const lastActivityDesc =
    await api.functional.discussionBoard.superAdmin.users.statistics.index(
      superAdminConnection,
      {
        body: {
          sort_by: "last_activity",
          sort_order: "desc",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(lastActivityDesc);
  // Test sorting by registration_date ascending
  const registrationDateAsc =
    await api.functional.discussionBoard.superAdmin.users.statistics.index(
      superAdminConnection,
      {
        body: {
          sort_by: "registration_date",
          sort_order: "asc",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(registrationDateAsc);
  // Test pagination edge case: first page with small limit
  const firstPageSmallLimit =
    await api.functional.discussionBoard.superAdmin.users.statistics.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(firstPageSmallLimit);
  // Test pagination edge case: large page number
  const largePage =
    await api.functional.discussionBoard.superAdmin.users.statistics.index(
      superAdminConnection,
      {
        body: {
          page: 1000,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(largePage);
  // Test filtering with date ranges
  const dateFiltered =
    await api.functional.discussionBoard.superAdmin.users.statistics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          registration_date_end: new Date().toISOString(),
          sort_by: "registration_date",
          sort_order: "desc",
          limit: 20,
          page: 1,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // Test filtering with minimum contributions
  const minContributions =
    await api.functional.discussionBoard.superAdmin.users.statistics.index(
      superAdminConnection,
      {
        body: {
          min_articles: 1,
          min_comments: 1,
          sort_by: "article_count",
          sort_order: "desc",
          limit: 15,
          page: 1,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(minContributions);
}
