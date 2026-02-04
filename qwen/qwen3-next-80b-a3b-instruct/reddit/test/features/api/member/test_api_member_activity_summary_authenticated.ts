import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberActivitySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberActivitySummary";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_activity_summary_authenticated(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate member using the authorized utility function
  // This creates a valid authenticated connection with access token in headers
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Check that authentication succeeded with valid response
  typia.assert(authResult);
  // Step 3: Now use the authenticated connection to call the activity summary endpoint
  // The connection.headers are auto-updated by authorize_member_join so we can use it directly
  const activitySummary =
    await api.functional.communityPlatform.member.analytics.members.activity.index(
      memberConnection,
    );
  // Step 4: Validate the response structure matches ICommunityPlatformMemberActivitySummary
  typia.assert(activitySummary);
  // Step 5: Validate that each metric is a non-negative number as per schema
  TestValidator.predicate(
    "averageLoginFrequency is non-negative",
    activitySummary.averageLoginFrequency >= 0,
  );
  TestValidator.predicate(
    "averagePostEngagementRate is non-negative",
    activitySummary.averagePostEngagementRate >= 0,
  );
  TestValidator.predicate(
    "averageCommentEngagementRate is non-negative",
    activitySummary.averageCommentEngagementRate >= 0,
  );
  TestValidator.predicate(
    "averageCommunitySubscriptions is non-negative",
    activitySummary.averageCommunitySubscriptions >= 0,
  );
}
