import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActivityLogAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLogAnalytic";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_analytics_retrieval_with_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test activity log analytics retrieval with organization manage permission.
   *
   * Validates that a member with org:manage permission can successfully retrieve aggregated activity log analytics for their organization. The test verifies the endpoint returns proper analytics data including action type distributions, temporal trends, top performer statistics, and total activity counts.
   *
   * The analytics endpoint provides comprehensive insights into organizational activity patterns, properly scoped to the specified organization context. This ensures data isolation and correct permission-based access control.
   *
   * 1. Register a new member account with email and password credentials.
   * 2. Generate a random organization UUID for analytics retrieval.
   * 3. Call the activity log analytics endpoint with the organization ID.
   * 4. Validate the response contains all required analytics components.
   * 5. Verify the analytics are properly scoped to the organization context.
   */
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate a random organization ID
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve activity log analytics for the organization
  const analytics =
    await api.functional.hrm.member.organizations.activity_logs.analytics(
      memberConnection,
      {
        organizationId,
      },
    );
  typia.assert(analytics);
  // 4. Validate response contains all required components
  TestValidator.predicate(
    "has action_type_counts",
    analytics.action_type_counts !== undefined,
  );
  TestValidator.predicate(
    "has temporal_trends",
    analytics.temporal_trends !== undefined,
  );
  TestValidator.predicate(
    "has top_performers",
    analytics.top_performers !== undefined,
  );
  TestValidator.predicate(
    "has total_count",
    analytics.total_count !== undefined,
  );
}
