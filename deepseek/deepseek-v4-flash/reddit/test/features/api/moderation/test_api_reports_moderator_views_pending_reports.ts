import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_community_reports_create } from "../../../generate/generate_random_community_platform_member_community_reports_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_community_report } from "../../../prepare/prepare_random_community_platform_community_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_reports_moderator_views_pending_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member1 who will be the community moderator/owner
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: "mod_" + RandomGenerator.alphabets(8),
      password: "password123!",
    },
  });
  typia.assert(member1);
  // 2. Create a community — member1 becomes owner (auto-moderator)
  const community =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 3. Register member2 who will create content and submit a report
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: "reporter_" + RandomGenerator.alphabets(8),
      password: "password123!",
    },
  });
  typia.assert(member2);
  // 4. Subscribe member2 to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      member2Connection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 5. Create a text post as member2 in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.paragraph({ sentences: 10 });
  const post = await generate_random_community_platform_member_posts_create(
    member2Connection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: postTitle,
        body: postBody,
      },
    },
  );
  typia.assert(post);
  // 6. Submit a report against the post as member2
  const reportReason =
    "This post contains inappropriate content that violates community guidelines.";
  const report =
    await generate_random_community_platform_member_community_reports_create(
      member2Connection,
      {
        body: {
          targetId: post.id,
          targetType: "post",
          reason: reportReason,
        },
      },
    );
  typia.assert(report);
  // 7. As member1 (moderator), retrieve the pending reports
  // member1Connection already has the JWT token from step 1
  const reportsPage: IPageICommunityPlatformCommunityReport.ISummary =
    await api.functional.communityPlatform.member.reports.index(
      member1Connection,
      {
        body: {} satisfies ICommunityPlatformCommunityReport.IRequest,
      },
    );
  typia.assert(reportsPage);
  // 8. Validate the paginated response
  TestValidator.equals("pagination current", reportsPage.pagination.current, 1);
  TestValidator.equals("total records", reportsPage.pagination.records, 1);
  TestValidator.equals("total pages", reportsPage.pagination.pages, 1);
  TestValidator.predicate(
    "has exactly 1 report",
    reportsPage.data.length === 1,
  );
  const firstReport: ICommunityPlatformCommunityReport.ISummary =
    reportsPage.data[0]!;
  TestValidator.equals("report status", firstReport.status, "pending");
  TestValidator.equals("target type", firstReport.target_type, "post");
  TestValidator.equals("report reason", firstReport.reason, reportReason);
  TestValidator.equals(
    "reporter username",
    firstReport.reporter.username,
    member2.username,
  );
  TestValidator.equals(
    "community name",
    firstReport.community.name,
    community.name,
  );
  TestValidator.predicate("report has valid id", (firstReport.id ?? "") !== "");
  TestValidator.predicate(
    "report has valid created_at",
    (firstReport.created_at ?? "") !== "",
  );
}
