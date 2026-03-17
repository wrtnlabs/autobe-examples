import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
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
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_list_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test authorization boundary: verify that non-moderators cannot access
   * reports for a community. Only moderators of the specific community
   * should have access to its reports.
   */
  // 1. Create Member A - will be community owner and moderator
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community (becomes owner/moderator automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A creates a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // 4. Create Member B - will report the post
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 5. Member B reports the post
  const report = await generate_random_community_platform_member_reports_create(
    memberBConnection,
    {
      body: {
        community_id: community.id,
        target_type: "post",
        target_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(report);
  // 6. Create Member C - not a moderator, will attempt unauthorized access
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // 7. Test: Member C (non-moderator) attempts to access reports
  // Should receive 403 Forbidden
  await TestValidator.httpError(
    "non-moderator cannot access reports",
    403,
    async () => {
      await api.functional.communityPlatform.member.reports.index(
        memberCConnection,
        {
          body: {
            community_id: community.id,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    },
  );
  // 8. Test: Member B (reporter, but not moderator) also cannot access reports
  await TestValidator.httpError(
    "reporter cannot access reports without moderator role",
    403,
    async () => {
      await api.functional.communityPlatform.member.reports.index(
        memberBConnection,
        {
          body: {
            community_id: community.id,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    },
  );
  // 9. Verify: Member A (owner/moderator) CAN access reports
  const reportsList =
    await api.functional.communityPlatform.member.reports.index(
      memberAConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(reportsList);
  // Verify the report is in the list
  TestValidator.predicate("report list contains the created report", () =>
    reportsList.data.some((r) => r.id === report.id),
  );
}
