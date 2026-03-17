import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
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
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_access_denied_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Member A creates community and becomes owner/moderator
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Member A creates a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // Create a report on the post
  const report = await generate_random_community_platform_member_reports_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        target_type: "post",
        target_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(report);
  // Member B (not a moderator) attempts to access the report
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Expect 403 Forbidden when non-moderator tries to access the report
  await TestValidator.httpError(
    "non-moderator cannot access report",
    403,
    async () =>
      await api.functional.communityPlatform.member.reports.at(
        memberBConnection,
        {
          reportId: report.id,
        },
      ),
  );
}
