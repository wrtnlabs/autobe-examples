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

export async function test_api_community_report_list_pending_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Register Member A (owner)
  const memberAConn: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConn, {});
  // Register Member B (content creator and reporter)
  const memberBConn: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConn, {});
  // Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConn,
      {},
    );
  // Member B subscribes to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberBConn,
    { params: { communityId: community.id } },
  );
  // Member B creates a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberBConn,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  // Member B submits a report against their own post
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  await generate_random_community_platform_member_community_reports_create(
    memberBConn,
    {
      body: {
        targetId: post.id,
        targetType: "post",
        reason: reportReason,
      },
    },
  );
  // Member A (owner) retrieves the paginated list of pending reports for their community
  const page =
    await api.functional.communityPlatform.member.community_reports.index(
      memberAConn,
      {
        body: {
          communityId: community.id,
          status: "pending",
        },
      },
    );
  typia.assert(page);
  // Validate pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination records", page.pagination.records, 1);
  TestValidator.equals("pagination pages", page.pagination.pages, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  // Validate exactly 1 report in data
  TestValidator.equals("data count", page.data.length, 1);
  const report = page.data[0]!;
  // Validate report fields
  TestValidator.equals("target type", report.target_type, "post");
  TestValidator.equals("reason", report.reason, reportReason);
  TestValidator.equals("status", report.status, "pending");
  TestValidator.equals(
    "reporter username",
    report.reporter.username,
    memberB.username,
  );
  TestValidator.equals("community name", report.community.name, community.name);
  // Validate targetPost is present with correct id and title
  TestValidator.predicate("targetPost is present", report.targetPost !== null);
  if (report.targetPost !== null) {
    TestValidator.equals("targetPost id", report.targetPost.id, post.id);
    TestValidator.equals(
      "targetPost title",
      report.targetPost.title,
      post.title,
    );
  }
}
