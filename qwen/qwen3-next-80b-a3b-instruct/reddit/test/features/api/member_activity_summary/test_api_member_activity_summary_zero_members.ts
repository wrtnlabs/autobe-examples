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
export async function test_api_member_activity_summary_zero_members(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Since we want to test zero members scenario, we must ensure there are no other members
  // This test scenario specifically tests the state where the database has exactly one member (the one we created)
  // The service should still return 0 for all metrics because the member has no activity
  // Step 3: Call the activity summary endpoint using the authorized member connection
  const activitySummary: ICommunityPlatformMemberActivitySummary =
    await api.functional.communityPlatform.member.analytics.members.activity.index(
      memberConnection,
    );
  // Step 4: Validate that all metrics are exactly 0
  TestValidator.equals(
    "average login frequency is 0",
    activitySummary.averageLoginFrequency,
    0,
  );
  TestValidator.equals(
    "average post engagement rate is 0",
    activitySummary.averagePostEngagementRate,
    0,
  );
  TestValidator.equals(
    "average comment engagement rate is 0",
    activitySummary.averageCommentEngagementRate,
    0,
  );
  TestValidator.equals(
    "average community subscriptions is 0",
    activitySummary.averageCommunitySubscriptions,
    0,
  );
  // Step 5: Verify that typia.assert() validates the entire response structure
  typia.assert(activitySummary);
}
