import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_report_queue_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Create a community (moderator becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe moderator to the community (required for posting)
  await generate_random_community_platform_member_subscriptions_create(
    moderatorConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    moderatorConnection,
    { body: { communityId: community.id, contentType: "text" } },
  );
  typia.assert(post);
  // 5. Create second member account
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // 6. Subscribe second member to the community
  await generate_random_community_platform_member_subscriptions_create(
    reporterConnection,
    { body: { community_id: community.id } },
  );
  // 7. Second member reports the post
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    { body: { communityId: community.id, postId: post.id } },
  );
  typia.assert(report);
  // 8. Moderator retrieves the report queue
  const reportQueue =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {},
      },
    );
  typia.assert(reportQueue);
  // Validation
  TestValidator.predicate(
    "pagination exists",
    reportQueue.pagination !== undefined,
  );
  TestValidator.predicate("has reports", reportQueue.data.length >= 1);
  const foundReport = reportQueue.data.find((r) => r.id === report.id);
  TestValidator.predicate("report exists in queue", foundReport !== undefined);
  if (foundReport !== undefined) {
    TestValidator.equals("status is pending", foundReport.status, "pending");
    TestValidator.equals(
      "content type is post",
      foundReport.contentType,
      "post",
    );
    TestValidator.equals(
      "community matches",
      foundReport.community.id,
      community.id,
    );
    TestValidator.equals(
      "reporter matches",
      foundReport.reporter.id,
      reporter.member.id,
    );
    TestValidator.equals("post id matches", foundReport.postId, post.id);
    TestValidator.predicate("reason exists", foundReport.reason.length >= 10);
    TestValidator.predicate(
      "content preview exists",
      foundReport.contentPreview !== null,
    );
  }
}
