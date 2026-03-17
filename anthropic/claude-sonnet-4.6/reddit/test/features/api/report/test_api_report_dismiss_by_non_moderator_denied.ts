import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
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
import { generate_random_community_member_communities_reports_create } from "../../../generate/generate_random_community_member_communities_reports_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_report_dismiss_by_non_moderator_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A (owner) and create connection
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 2: Member A creates a community
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register member B (poster/reporter)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 4: Member B subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberBConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // Step 5: Member B creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberBConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 6: Member B reports the post
  const report =
    await generate_random_community_member_communities_reports_create(
      memberBConnection,
      {
        params: { communityId: community.id },
        body: {
          post_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  // Step 7: Register member C (plain subscriber, no moderator role)
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  // Step 8: Member C subscribes to the community (plain subscriber only)
  const subscriptionC =
    await api.functional.community.member.communities.subscriptions.create(
      memberCConnection,
      { communityId: community.id },
    );
  typia.assert(subscriptionC);
  // Main test: Member C (non-moderator) attempts to dismiss the report — must get 403
  await TestValidator.httpError(
    "non-moderator cannot dismiss report",
    403,
    async () => {
      await api.functional.community.member.communities.reports.dismiss(
        memberCConnection,
        {
          communityId: community.id,
          reportId: report.id,
        },
      );
    },
  );
}
