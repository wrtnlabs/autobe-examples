import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_member_reports_create } from "../../../generate/generate_random_community_hub_member_reports_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";
import { prepare_random_community_hub_report } from "../../../prepare/prepare_random_community_hub_report";

/**
 * Test that dismissing a report that has already been processed is rejected.
 *
 * Validates the report dismissal workflow's idempotency protection. A community owner registers, creates a community, subscribes, creates a post, and files a report against it — establishing a report in pending status. The owner (acting as moderator) then dismisses the report successfully, transitioning it to "dismissed" status. The same moderator then attempts to dismiss the same report a second time.
 *
 * Since the report is no longer in "pending" status, the system must reject the second dismissal attempt with an error indicating the report has already been handled. The reported post remains intact throughout both dismissal attempts.
 *
 * 1. Register and authenticate the community owner via join.
 * 2. Create a community and subscribe the owner to enable posting.
 * 3. Create a post within the community to serve as reportable content.
 * 4. File a report against the post — enters pending status.
 * 5. First dismissal succeeds with status "dismissed".
 * 6. Second dismissal attempt is rejected — report already processed.
 * 7. Verify the reported post remains intact.
 */
export async function test_api_report_dismiss_already_processed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, { body: {} });
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe the owner to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      ownerConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: {},
    },
  );
  typia.assert(post);
  // 5. File a report against the post
  const report = await generate_random_community_hub_member_reports_create(
    ownerConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
      },
    },
  );
  typia.assert(report);
  TestValidator.equals("report initial status", report.status, "pending");
  // 6. First dismissal — should succeed
  const dismissedReport =
    await api.functional.communityHub.member.reports.dismiss(ownerConnection, {
      reportId: report.id,
    });
  typia.assert(dismissedReport);
  TestValidator.equals(
    "dismissed report status",
    dismissedReport.status,
    "dismissed",
  );
  // 7. Second dismissal attempt — should be rejected
  await TestValidator.error(
    "second dismiss on already processed report",
    async () => {
      await api.functional.communityHub.member.reports.dismiss(
        ownerConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
