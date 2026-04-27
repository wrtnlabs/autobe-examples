import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCommentTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCommentTarget";
import type { ICommunityPlatformReportPostTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportPostTarget";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that a regular member who is NOT a moderator or owner of the community receives a 403 Forbidden error when attempting to retrieve a report.
 *
 * Verifies the authorization guard on the community report retrieval endpoint. A non-moderator member must be rejected with 403 when trying to access a report that belongs to a community where they hold no moderation role.
 *
 * 1. Member A registers as a new member and creates a community, becoming its owner.
 * 2. Member B registers, subscribes to the community, creates a text post, then submits a report against that post.
 * 3. Member C registers as a separate member with no moderation appointment in the community.
 * 4. Member C attempts to retrieve the report and receives a 403 Forbidden error.
 */
export async function test_api_community_report_access_forbidden_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A registers and creates a community
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  // Step 2: Member B registers, subscribes, creates a post, and reports it
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  await generate_random_community_platform_member_communities_subscribers_create(
    memberBConnection,
    { params: { communityId: community.id } },
  );
  const post = await generate_random_community_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: "Test post content for reporting purposes.",
      },
    },
  );
  const report = await generate_random_community_platform_member_reports_create(
    memberBConnection,
    {
      body: {
        targetType: "post" as const,
        targetId: post.id,
        reason: "This is a test report reason for E2E testing.",
      },
    },
  );
  // Step 3: Member C registers as a non-moderator member
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  // Step 4: Member C attempts to access the report and expects 403 Forbidden
  await TestValidator.httpError(
    "non-moderator access to community report",
    403,
    async () => {
      await api.functional.communityPlatform.member.community_reports.at(
        memberCConnection,
        { reportId: report.id },
      );
    },
  );
}
