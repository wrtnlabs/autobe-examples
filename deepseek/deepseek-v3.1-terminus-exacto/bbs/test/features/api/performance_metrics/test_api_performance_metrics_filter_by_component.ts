import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_performance_metrics_filter_by_component(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test filtering by each source component
  const sourceComponents = [
    "api_gateway",
    "database",
    "cache",
    "frontend",
  ] as const;
  for (const sourceComponent of sourceComponents) {
    // Test with specific source component filter
    const response =
      await api.functional.discussionBoard.superAdmin.performance_metrics.index(
        superAdminConnection,
        {
          body: {
            source_component: sourceComponent,
            page: typia.random<
              number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
            >(),
            limit: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Default<20> &
                tags.Minimum<1> &
                tags.Maximum<100>
            >(),
            sort: RandomGenerator.pick(["asc", "desc"] as const),
          } satisfies IDiscussionBoardPerformanceMetric.IRequest,
        },
      );
    typia.assert(response);
    // Validate response structure has pagination and data
    TestValidator.predicate(
      "response has pagination",
      "pagination" in response,
    );
    TestValidator.predicate("response has data", "data" in response);
    TestValidator.equals("data is array", Array.isArray(response.data), true);
    // Validate each metric item has required fields
    for (const metric of response.data) {
      TestValidator.predicate("metric has id", "id" in metric);
      TestValidator.predicate(
        "metric has metric_type",
        "metric_type" in metric,
      );
      TestValidator.predicate(
        "metric has metric_value",
        "metric_value" in metric,
      );
      TestValidator.predicate(
        "metric has metric_unit",
        "metric_unit" in metric,
      );
      TestValidator.predicate(
        "metric has source_component",
        "source_component" in metric,
      );
      TestValidator.predicate(
        "metric has collection_timestamp",
        "collection_timestamp" in metric,
      );
      // Validate source component filtering
      TestValidator.equals(
        "source component matches filter",
        metric.source_component,
        sourceComponent,
      );
    }
  }
  // Test pagination functionality
  const page1Response =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          source_component: "api_gateway",
          page: 1,
          limit: 10,
          sort: "desc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          source_component: "api_gateway",
          page: 2,
          limit: 10,
          sort: "desc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate pagination metadata - simplified validation
  TestValidator.predicate(
    "page1 has pagination",
    "pagination" in page1Response,
  );
  TestValidator.predicate(
    "page2 has pagination",
    "pagination" in page2Response,
  );
  // Test without filter (should return all components)
  const allComponentsResponse =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 50,
          sort: "desc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(allComponentsResponse);
  // Validate that unfiltered response contains mixed components
  if (allComponentsResponse.data.length > 0) {
    const uniqueComponents = new Set(
      allComponentsResponse.data.map((m) => m.source_component),
    );
    TestValidator.predicate(
      "unfiltered response contains multiple components",
      uniqueComponents.size > 1,
    );
  }
}
