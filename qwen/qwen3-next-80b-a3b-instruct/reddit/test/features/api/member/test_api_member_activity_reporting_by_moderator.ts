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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberActivitySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberActivitySummary";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_activity_reporting_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(moderator);
  // Step 2: Call the member activity reporting endpoint using moderator connection
  const activityReport: IPageICommunityPlatformMemberActivitySummary =
    await api.functional.communityPlatform.member.reports.members.activity.index(
      moderatorConnection,
    );
  typia.assert(activityReport);
  // Step 3: Validate pagination structure matches returned data
  const pagination = activityReport.pagination;
  TestValidator.equals(
    "pagination current is at least 1",
    pagination.current,
    1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is reasonable",
    pagination.pages >= 0,
  );
  // Step 4: Validate that we have at least one member activity summary
  TestValidator.predicate(
    "has at least one member activity summary",
    activityReport.data.length > 0,
  );
  // Step 5: Validate activity summary structure matches the schema exactly
  const firstSummary = activityReport.data[0];
  TestValidator.predicate(
    "averageLoginFrequency is number",
    typeof firstSummary.averageLoginFrequency === "number",
  );
  TestValidator.predicate(
    "averagePostEngagementRate is number",
    typeof firstSummary.averagePostEngagementRate === "number",
  );
  TestValidator.predicate(
    "averageCommentEngagementRate is number",
    typeof firstSummary.averageCommentEngagementRate === "number",
  );
  TestValidator.predicate(
    "averageCommunitySubscriptions is number",
    typeof firstSummary.averageCommunitySubscriptions === "number",
  );
  // Step 6: Confirm member activity metrics are non-negative
  TestValidator.predicate(
    "averageLoginFrequency is non-negative",
    firstSummary.averageLoginFrequency >= 0,
  );
  TestValidator.predicate(
    "averagePostEngagementRate is non-negative",
    firstSummary.averagePostEngagementRate >= 0,
  );
  TestValidator.predicate(
    "averageCommentEngagementRate is non-negative",
    firstSummary.averageCommentEngagementRate >= 0,
  );
  TestValidator.predicate(
    "averageCommunitySubscriptions is non-negative",
    firstSummary.averageCommunitySubscriptions >= 0,
  );
  // Step 7: Verify that non-moderators cannot access this sensitive endpoint (negative test)
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "guest cannot access member activity reporting",
    async () => {
      await api.functional.communityPlatform.member.reports.members.activity.index(
        guestConnection,
      );
    },
  );
}
