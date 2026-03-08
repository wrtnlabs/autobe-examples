import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_report_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account who will be the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community (ownerConnection becomes the owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a second member account who will author a post
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // 4. Have the author subscribe to the community
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  // 5. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
        linkUrl: null,
        imageUrl: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create a third member account who will submit the report
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // 7. Have the reporter subscribe to the community
  await generate_random_community_platform_member_subscriptions_create(
    reporterConnection,
    { body: { community_id: community.id } },
  );
  // 8. Submit a report on the post
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: community.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        postId: post.id,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 9. Create a fourth member account who is NOT a moderator of this community
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonModeratorConnection, {});
  // 10. Attempt to retrieve the report as the non-moderator member
  await TestValidator.httpError(
    "non-moderator should be denied access to report",
    403,
    async () =>
      await api.functional.communityPlatform.member.reports.at(
        nonModeratorConnection,
        { reportId: report.id },
      ),
  );
}
