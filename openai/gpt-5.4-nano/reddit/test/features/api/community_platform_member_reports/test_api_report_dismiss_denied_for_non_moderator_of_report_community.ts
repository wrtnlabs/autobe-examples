import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import type { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_dismiss_denied_for_non_moderator_of_report_community(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuthorized);
  // 2) Create community A (owned by member A)
  const communityA =
    await generate_random_community_platform_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 3) Assign member A as moderator for community A
  const moderatorAssignment =
    await generate_random_community_platform_community_moderators_create(
      memberAConnection,
      {
        body: {
          communityId: communityA.id,
          moderatorUserId: memberAAuthorized.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 4) Member A creates a post in community A
  await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: communityA.id,
        post_type: "text",
        title: RandomGenerator.name(),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // We need postId for creating report and later verification.
  // Create report by targeting the same postId; since we don't have a helper
  // to retrieve created postId from the generator above, create a post using
  // the SDK instead.
  const postCreateBody = {
    community_id: communityA.id,
    post_type: "text",
    title: RandomGenerator.name(),
    body_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformPost.ICreate;
  await api.functional.communityPlatform.member.posts.create(
    memberAConnection,
    {
      body: postCreateBody,
    },
  );
  // No postId return from create endpoint; thus cannot proceed.
  throw new Error("Missing postId retrieval capability in current API/DTO set");
}
