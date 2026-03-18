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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_reports_target_rebind_within_community_success(
  connection: api.IConnection,
): Promise<void> {
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuthRaw = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(reporterAuthRaw);

  const communityRaw = await api.functional.communityPlatform.communities.create(
    reporterConnection,
    {
      body: {
        name: `community-${RandomGenerator.alphabets(8)}`,
        description: `desc-${RandomGenerator.alphabets(12)}`,
        icon_href: `https://example.com/icon/${RandomGenerator.alphabets(10)}`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(communityRaw);
  const community = communityRaw as unknown as ICommunityPlatformCommunity;

  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthRaw = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(moderatorAuthRaw);
  const moderatorAuth = moderatorAuthRaw as unknown as { id: string };

  await api.functional.communityPlatform.communityModerators.create(
    reporterConnection,
    {
      body: {
        communityId: community.id,
        moderatorUserId: moderatorAuth.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );

  const postARaw = await api.functional.communityPlatform.member.posts.create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Post-A-${RandomGenerator.alphabets(6)}`,
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(postARaw);
  const postA = postARaw as unknown as { id: string; community_id: string };

  const postBRaw = await api.functional.communityPlatform.member.posts.create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Post-B-${RandomGenerator.alphabets(6)}`,
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(postBRaw);
  const postB = postBRaw as unknown as { id: string; community_id: string };

  const reportRaw = await api.functional.communityPlatform.member.reports.create(
    reporterConnection,
    {
      body: {
        communityId: community.id,
        targetType: "post",
        targetId: postA.id,
        reason: `reason-${RandomGenerator.alphabets(10)}`,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(reportRaw);
  const report = reportRaw as unknown as { id: string };

  await api.functional.communityPlatform.member.reports.targets.updateReportTargets(
    moderatorConnection,
    {
      reportId: report.id,
      body: {
        target_type: "post",
        target_id: postB.id,
      } satisfies ICommunityPlatformReportTarget.IUpdate,
    },
  );

  TestValidator.equals(
    "rebinding target is within same community (postA)",
    postA.community_id,
    community.id,
  );
  TestValidator.equals(
    "rebinding target is within same community (postB)",
    postB.community_id,
    community.id,
  );
}
