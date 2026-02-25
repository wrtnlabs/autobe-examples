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

export async function test_api_report_resolution_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner joins and creates community (becomes moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 2. Owner subscribes to their own community
  const subscription =
    await api.functional.community.member.communities.subscribe(
      ownerConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 3. Owner creates a post in the community
  const post = await generate_random_community_member_communities_posts_create(
    ownerConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 4. Reporter joins as a different member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // 5. Reporter subscribes to the community to enable reporting
  const reporterSubscription =
    await api.functional.community.member.communities.subscribe(
      reporterConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(reporterSubscription);
  // 6. Reporter creates a report on the post (PENDING status)
  const report = await generate_random_community_member_reports_create(
    reporterConnection,
    {
      body: {
        content_type: "POST",
        content_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(report);
  // Verify report status is PENDING
  TestValidator.equals(
    "report status should be PENDING",
    report.status,
    "PENDING",
  );
  // 7. Owner (moderator) queries the resolution for the pending report
  const resolution = await api.functional.community.member.reports.resolution(
    ownerConnection,
    {
      reportId: report.id,
    },
  );
  // 8. Verify resolution is null since no resolution exists yet
  TestValidator.equals(
    "resolution should be null for pending report",
    resolution,
    null,
  );
}
