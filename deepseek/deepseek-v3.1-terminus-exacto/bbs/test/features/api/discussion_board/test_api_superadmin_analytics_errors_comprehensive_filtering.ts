import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_analytics_errors_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies
        | (string & tags.Format<"ipv4">)
        | null
        | undefined as (string & tags.Format<"ipv4">) | null | undefined,
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Call analytics errors endpoint with comprehensive filters
  const response =
    await api.functional.discussionBoard.superAdmin.system.analytics.errors.index(
      superAdminConnection,
      {
        body: {
          error_type: "authentication_error",
          severity: "error",
          environment: "production",
          component: "auth",
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata - corrected nested structure access
  TestValidator.equals(
    "current page",
    response.pagination.pagination.pagination.pagination.current,
    1 satisfies number & tags.Type<"int32"> & tags.Minimum<1> as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
  );
  TestValidator.equals(
    "page limit",
    response.pagination.pagination.pagination.pagination.limit,
    20 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  );
  TestValidator.predicate(
    "records count non-negative",
    response.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    Math.ceil(
      response.pagination.pagination.pagination.pagination.records /
        response.pagination.pagination.pagination.pagination.limit,
    ) >= 0,
  );
  // Validate data structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Validate each error log entry matches the filters (if data exists)
  if (response.data.length > 0) {
    for (const errorLog of response.data) {
      typia.assert(errorLog);
      TestValidator.equals(
        "error type matches filter",
        errorLog.error_type,
        "authentication_error",
      );
      TestValidator.equals(
        "severity matches filter",
        errorLog.severity,
        "error",
      );
      TestValidator.equals(
        "environment matches filter",
        errorLog.environment,
        "production",
      );
      // Handle nullable component field
      if (errorLog.component !== null && errorLog.component !== undefined) {
        TestValidator.equals(
          "component matches filter",
          errorLog.component,
          "auth",
        );
      }
      TestValidator.predicate(
        "occurred_at is valid date",
        !isNaN(new Date(errorLog.occurred_at).getTime()),
      );
    }
  } else {
    // Handle case where no matching errors found
    TestValidator.predicate(
      "empty result set for specific filters",
      response.data.length === 0,
    );
  }
}
