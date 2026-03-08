import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_report_queue_non_moderator_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Create a community (owner automatically gets moderator privileges)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  // 3. Subscribe owner to their own community (required for posting)
  await generate_random_community_platform_member_subscriptions_create(
    ownerConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    ownerConnection,
    {
      body: {
        communityId: community.id,
        contentType: "text",
        title: RandomGenerator.name(),
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: undefined,
        imageUrl: undefined,
      },
    },
  );
  // 5. Create second member (reporter)
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // 6. Subscribe reporter to the community
  await generate_random_community_platform_member_subscriptions_create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 7. Reporter submits a report on the post
  await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: community.id,
        postId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        commentId: undefined,
      },
    },
  );
  // 8. Create third member (non-moderator, not subscribed to this community)
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonModeratorConnection, {});
  // 9. Test: Non-moderator attempts to access reports - should get 403 Forbidden
  await TestValidator.httpError(
    "should return 403 Forbidden when non-moderator tries to view reports",
    403,
    async () => {
      await api.functional.communityPlatform.member.reports.index(
        nonModeratorConnection,
        {
          body: {
            communityId: community.id,
          },
        },
      );
    },
  );
}
