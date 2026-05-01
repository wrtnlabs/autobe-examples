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
 * Test that a regular member who is not a moderator cannot retrieve a content report.
 *
 * Verifies the authorization boundary for report retrieval — only moderators or
 * owners of the community where the reported content resides may access reports.
 * A non-moderator member attempting to retrieve a report from a community they
 * do not moderate must receive HTTP 403 Forbidden.
 *
 * 1. Member A joins the platform and creates a community (becoming owner).
 * 2. Member A subscribes to the community and creates a post.
 * 3. Member B joins the platform independently.
 * 4. Member B subscribes to the same community and files a report against Member A's post.
 * 5. Member B attempts to retrieve the report, which must be rejected with 403 Forbidden.
 */
export async function test_api_report_retrieval_by_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A: Join, create community, subscribe, create post
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  const memberASub =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberAConnection,
      { communityName: community.name },
    );
  typia.assert(memberASub);
  const memberAPost =
    await generate_random_community_hub_communities_posts_create(
      memberAConnection,
      {
        params: { communityName: community.name },
      },
    );
  typia.assert(memberAPost);
  // 2. Member B: Join, subscribe, file report against Member A's post
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  const memberBSub =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberBConnection,
      { communityName: community.name },
    );
  typia.assert(memberBSub);
  const report = await generate_random_community_hub_member_reports_create(
    memberBConnection,
    {
      body: {
        target_type: "post",
        target_id: memberAPost.id,
      },
    },
  );
  typia.assert(report);
  // 3. Member B attempts to retrieve the report → must receive 403 Forbidden
  await TestValidator.httpError(
    "non-moderator cannot retrieve report",
    403,
    async () =>
      await api.functional.communityHub.member.reports.at(memberBConnection, {
        reportId: report.id,
      }),
  );
}
