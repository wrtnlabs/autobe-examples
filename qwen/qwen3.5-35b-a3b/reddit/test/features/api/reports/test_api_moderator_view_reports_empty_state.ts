import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportView";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_moderator_view_reports_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and becomes community owner
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoinResult);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminJoinResult.token.access,
    },
  });
  // 2. Admin creates a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: typia.random<string & tags.MaxLength<200>>(),
          icon_url: typia.random<string & tags.Format<"uri">>() ?? null,
        },
      },
    );
  typia.assert(community);
  // 3. Member joins and subscribes to community
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberJoinResult);
  const memberSubscribeConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberSubscribeConnection, {
    body: {
      email: memberJoinResult.email,
      password: memberJoinResult.token.access,
    },
  });
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberSubscribeConnection,
      {
        communityId: community.id,
        body: {
          confirmSubscription: true,
        },
      },
    );
  typia.assert(subscription);
  // 4. Member creates a post in the community
  const memberPostConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberPostConnection, {
    body: {
      email: memberJoinResult.email,
      password: memberJoinResult.token.access,
    },
  });
  const post = await api.functional.redditPlatform.member.posts.create(
    memberPostConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: typia.random<string & tags.MaxLength<10000>>(),
      },
    },
  );
  typia.assert(post);
  // 5. Member submits a report for the post
  const memberReportConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberReportConnection, {
    body: {
      email: memberJoinResult.email,
      password: memberJoinResult.token.access,
    },
  });
  const report = await api.functional.redditPlatform.member.reports.create(
    memberReportConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: post.id,
        reason: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 8,
          wordMax: 12,
        }),
      },
    },
  );
  typia.assert(report);
  // 6. Admin calls the endpoint to retrieve view records for this unviewed report
  const adminViewConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminViewConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminJoinResult.token.access,
    },
  });
  const viewsResponse =
    await api.functional.redditPlatform.admin.reports.views.index(
      adminViewConnection,
      {
        reportId: report.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(viewsResponse);
  // 7. Verify the response returns an empty data array
  TestValidator.equals(
    "view records data array is empty",
    viewsResponse.data.length,
    0,
  );
  // 8. Verify pagination metadata shows total_records: 0 and total_pages: 0
  TestValidator.equals(
    "pagination total_records is 0",
    viewsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total_pages is 0",
    viewsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    viewsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    viewsResponse.pagination.limit,
    20,
  );
}