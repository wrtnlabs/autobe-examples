import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_voting_metrics_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Retrieve voting analytics metrics
  const analytics =
    await api.functional.communityPlatform.admin.analytics.voting_metrics.index(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate pagination structure - business logic validation
  TestValidator.predicate(
    "current page non-negative",
    analytics.pagination.current >= 0,
  );
  TestValidator.predicate("positive limit", analytics.pagination.limit > 0);
  TestValidator.predicate(
    "records count non-negative",
    analytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    analytics.pagination.pages >= 0,
  );
  // Validate analytics data structure - business logic
  if (analytics.data.length > 0) {
    const sampleRecord = analytics.data[0];
    // Validate period type is one of expected values
    const validPeriodTypes = ["hourly", "daily", "weekly", "monthly"] as const;
    TestValidator.predicate(
      "valid period type",
      validPeriodTypes.includes(sampleRecord.period_type),
    );
    // Validate numeric fields follow business logic constraints
    TestValidator.predicate(
      "non-negative vote submission count",
      sampleRecord.vote_submission_count >= 0,
    );
    TestValidator.predicate(
      "non-negative karma impact",
      sampleRecord.karma_impact_total >= 0,
    );
    TestValidator.predicate(
      "vote ratio between 0 and 1",
      sampleRecord.vote_ratio >= 0 && sampleRecord.vote_ratio <= 1,
    );
    TestValidator.predicate(
      "error rate non-negative",
      sampleRecord.error_rate >= 0,
    );
    // Validate time period consistency
    TestValidator.predicate(
      "period end after period start",
      new Date(sampleRecord.period_end) > new Date(sampleRecord.period_start),
    );
  }
}
