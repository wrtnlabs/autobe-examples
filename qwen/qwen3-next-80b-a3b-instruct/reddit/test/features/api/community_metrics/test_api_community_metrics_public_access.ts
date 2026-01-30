import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommunityMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMetrics";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunityMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunityMetrics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_community_metrics_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a new guest connection without any authentication headers
  const guestConnection: api.IConnection = { host: connection.host };
  // Call the community metrics endpoint without any authentication token
  const response: IPageICommunityBbsCommunityMetrics.ISummary =
    await api.functional.communityBbs.admin.analytics.communities.metrics.index(
      guestConnection,
    );
  // Validate the response structure
  typia.assert(response);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is at least 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate("data is not empty", response.data.length > 0);
  // Validate each community metrics object in data array
  for (const metrics of response.data) {
    TestValidator.predicate(
      "active_subscribers is non-negative",
      metrics.active_subscribers >= 0,
    );
    TestValidator.predicate(
      "growth_rate_7d is within range",
      metrics.growth_rate_7d >= -100 && metrics.growth_rate_7d <= 1000,
    );
    TestValidator.predicate(
      "engagement_rate is within range",
      metrics.engagement_rate >= 0 && metrics.engagement_rate <= 100,
    );
    TestValidator.predicate(
      "content_quality_score is within range",
      metrics.content_quality_score >= 0 && metrics.content_quality_score <= 10,
    );
    TestValidator.predicate(
      "trending_score is within range",
      metrics.trending_score >= 0 && metrics.trending_score <= 100,
    );
  }
}
