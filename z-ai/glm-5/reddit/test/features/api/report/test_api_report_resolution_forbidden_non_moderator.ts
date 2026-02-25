import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import type { ICommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportResolution";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_reports_create } from "../../../generate/generate_random_community_member_reports_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_report_resolution_forbidden_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authentication and community setup
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 2. Owner subscribes to enable post creation
  await api.functional.community.member.communities.subscribe(ownerConnection, {
    communityName: community.name,
  });
  // 3. Owner creates a post
  const post = await generate_random_community_member_communities_posts_create(
    ownerConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 4. Non-moderator authentication
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModerator = await authorize_member_join(nonModeratorConnection, {});
  typia.assert(nonModerator);
  // 5. Non-moderator subscribes to the community
  await api.functional.community.member.communities.subscribe(
    nonModeratorConnection,
    {
      communityName: community.name,
    },
  );
  // 6. Non-moderator creates a report on the post
  const report = await generate_random_community_member_reports_create(
    nonModeratorConnection,
    {
      body: {
        content_type: "POST",
        content_id: post.id,
      },
    },
  );
  typia.assert(report);
  // 7. Owner approves the report (creates resolution)
  const resolution = await api.functional.community.member.reports.approve(
    ownerConnection,
    {
      reportId: report.id,
      body: { notes: "Approved by owner" } satisfies ICommunityReport.IApprove,
    },
  );
  typia.assert(resolution);
  // 8. Non-moderator attempts to access resolution - should fail with 403
  await TestValidator.httpError(
    "non-moderator cannot access resolution",
    403,
    async () =>
      await api.functional.community.member.reports.resolution(
        nonModeratorConnection,
        {
          reportId: report.id,
        },
      ),
  );
}
