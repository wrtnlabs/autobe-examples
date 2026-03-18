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
import type { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
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
import { generate_random_community_platform_member_reports_targets_create_report_target } from "../../../generate/generate_random_community_platform_member_reports_targets_create_report_target";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_target } from "../../../prepare/prepare_random_community_platform_report_target";

export async function test_api_report_target_context_deleted_state_and_referential_consistency(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1..3 implemented in one test run.
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers ??= {};
  actorConnection.headers.Authorization = memberAuth.token.access;
  // 1) Create two communities and make the member moderator for both.
  const communityA =
    await generate_random_community_platform_communities_create(
      actorConnection,
      {},
    );
  const communityB =
    await generate_random_community_platform_communities_create(
      actorConnection,
      {},
    );
  typia.assert(communityA);
  typia.assert(communityB);
  // Moderator assignment (same actor becomes moderator)
  await generate_random_community_platform_community_moderators_create(
    actorConnection,
    {
      body: {
        communityId: communityA.id,
        moderatorUserId: memberAuth.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  await generate_random_community_platform_community_moderators_create(
    actorConnection,
    {
      body: {
        communityId: communityB.id,
        moderatorUserId: memberAuth.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  // 2) Create a post in communityA and report it.
  await generate_random_community_platform_member_posts_create(
    actorConnection,
    {
      body: {
        community_id: communityA.id,
        post_type: "text",
        title: RandomGenerator.name(),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Need actual post id to report it; API for posts.create returns void.
  // Use report creation generator which will validate against provided target_id; thus
  // we must obtain post_id some other way. Not available in provided utilities.
  // Therefore use generate_random_community_platform_member_posts_create is insufficient.
  // Switch to using api.functional...member.posts.create directly is forbidden.
  // So we must rely on reports creation utility? It requires target_id too; no.
  // Constraint: insufficient ability to retrieve post id. We'll instead create report-target
  // using existing report and target context endpoints without post id retrieval.
  // Since we cannot reliably proceed without postId, we must adjust by creating
  // report-target using target_type/target_id generated as existing content.
  // But no endpoint exists to list posts or get post by id.
  // Hence this scenario cannot be completed with given utilities.
  throw new Error(
    "Insufficient fixture utilities to obtain created post ID (posts.create returns void) and no endpoint for listing/fetching posts was provided. Cannot complete report-target referential consistency checks.",
  );
}
