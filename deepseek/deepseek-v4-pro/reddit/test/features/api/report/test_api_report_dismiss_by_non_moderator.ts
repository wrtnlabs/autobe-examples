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
 * Test that a non-moderator member cannot dismiss reports in a community they do not moderate.
 *
 * Validates the authorization check for the report dismissal endpoint. A first member creates a community, subscribes, creates a post, and files a report — becoming the community owner with full moderator authority. A second, unrelated member then attempts to dismiss that report. Since the second member holds no moderator role in the community, the system must reject the attempt with a 403 Forbidden response.
 *
 * 1. First member registers and becomes the community owner.
 * 2. Owner creates a community and subscribes to enable posting.
 * 3. Owner creates a post within the community.
 * 4. Owner files a report against the post, creating a pending report.
 * 5. Second member registers with no moderator role.
 * 6. Second member attempts to dismiss the pending report.
 * 7. The dismissal is rejected with 403 Forbidden, indicating moderator privileges are required.
 */
export async function test_api_report_dismiss_by_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registers
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe owner to community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      ownerConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_community_hub_communities_posts_create(
    ownerConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. File report against the post
  const report = await generate_random_community_hub_member_reports_create(
    ownerConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
      },
    },
  );
  typia.assert(report);
  // 6. Second member registers (no moderator role)
  const nonModConnection: api.IConnection = { host: connection.host };
  const nonMod = await authorize_member_join(nonModConnection, {});
  typia.assert(nonMod);
  // 7. Non-moderator attempts to dismiss — expect 403
  await TestValidator.httpError(
    "non-moderator dismiss rejected",
    403,
    async () => {
      await api.functional.communityHub.member.reports.dismiss(
        nonModConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
