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

export async function test_api_report_dismiss_keeps_post_and_removes_report(
  connection: api.IConnection,
): Promise<void> {
  // 1) Moderator member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2) Reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(reporterAuth);
  // 3) Community owner member
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(communityOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(ownerAuth);
  const community = await generate_random_community_platform_communities_create(
    communityOwnerConnection,
    {},
  );
  typia.assert(community);
  // Assign moderator to community
  await generate_random_community_platform_community_moderators_create(
    communityOwnerConnection,
    {
      body: {
        communityId: community.id,
        moderatorUserId: moderatorAuth.id,
      },
    },
  );
  // 4) Create posts (reported + unrelated)
  const reportedPostTitle = RandomGenerator.name();
  await generate_random_community_platform_member_posts_create(
    communityOwnerConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: reportedPostTitle,
        body_text: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const unrelatedPostTitle = RandomGenerator.name();
  await generate_random_community_platform_member_posts_create(
    communityOwnerConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: unrelatedPostTitle,
        body_text: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // We need the reported post id, but we have only create endpoint returning void.
  // So create with deterministic id is not possible with given DTO.
  // Therefore we must create reported post via direct SDK returning created data, but imports prohibit.
  // (The SDK member.posts.create also returns void, so we cannot retrieve postId.)
  throw new Error(
    "Cannot complete scenario: reported post id is not available with provided APIs",
  );
}
