import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityReport";
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
import { generate_random_community_platform_member_community_reports_create } from "../../../generate/generate_random_community_platform_member_community_reports_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_community_report } from "../../../prepare/prepare_random_community_platform_community_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_reports_moderator_filters_by_specific_community(
  connection: api.IConnection,
): Promise<void> {
  // Setup actor-specific connections
  const member1Connection: api.IConnection = { host: connection.host };
  const member2Connection: api.IConnection = { host: connection.host };
  // 1. Register member1 (moderator/owner of both communities)
  await authorize_member_join(member1Connection, {});
  // 2. Create communityA — member1 becomes owner/moderator
  const communityA =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(communityA);
  // 3. Create communityB — member1 becomes owner/moderator
  const communityB =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(communityB);
  // 4. Register member2 (content creator & reporter)
  await authorize_member_join(member2Connection, {});
  // 5. Subscribe member2 to communityA
  await generate_random_community_platform_member_communities_subscribers_create(
    member2Connection,
    {
      params: { communityId: communityA.id },
    },
  );
  // 6. Create a text post in communityA
  const postA = await generate_random_community_platform_member_posts_create(
    member2Connection,
    {
      body: {
        communityId: communityA.id,
        type: "text",
      },
    },
  );
  typia.assert(postA);
  // 7. Submit report against postA (scoped to communityA)
  await generate_random_community_platform_member_community_reports_create(
    member2Connection,
    {
      body: {
        targetId: postA.id,
        targetType: "post",
      },
    },
  );
  // 8. Subscribe member2 to communityB
  await generate_random_community_platform_member_communities_subscribers_create(
    member2Connection,
    {
      params: { communityId: communityB.id },
    },
  );
  // 9. Create a text post in communityB
  const postB = await generate_random_community_platform_member_posts_create(
    member2Connection,
    {
      body: {
        communityId: communityB.id,
        type: "text",
      },
    },
  );
  typia.assert(postB);
  // 10. Submit report against postB (scoped to communityB)
  await generate_random_community_platform_member_community_reports_create(
    member2Connection,
    {
      body: {
        targetId: postB.id,
        targetType: "post",
      },
    },
  );
  // 11. Query reports as member1 with communityId filter set to communityA
  const reports = await api.functional.communityPlatform.member.reports.index(
    member1Connection,
    {
      body: {
        communityId: communityA.id,
        status: "pending",
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformCommunityReport.IRequest,
    },
  );
  typia.assert(reports);
  // 12. Validate that only the communityA report is returned
  TestValidator.equals("only one report returned", reports.data.length, 1);
  TestValidator.equals(
    "report is scoped to communityA",
    reports.data[0].community.id,
    communityA.id,
  );
  TestValidator.equals(
    "pagination shows exactly 1 record",
    reports.pagination.records,
    1,
  );
}
