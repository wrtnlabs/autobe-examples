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

export async function test_api_member_report_retrieval_moderator_scope_and_denial_consistency(
  connection: api.IConnection,
): Promise<void> {
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(reporterAuth);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(moderatorAuth);
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModeratorAuth = await authorize_member_join(nonModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(nonModeratorAuth);
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwnerAuth = await authorize_member_join(
    communityOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      },
    },
  );
  typia.assert(communityOwnerAuth);
  const communityA = await api.functional.communityPlatform.communities.create(
    communityOwnerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png" satisfies string &
          tags.MaxLength<80000>,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(communityA);
  const communityB = await api.functional.communityPlatform.communities.create(
    communityOwnerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon2.png" satisfies string &
          tags.MaxLength<80000>,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(communityB);
  await api.functional.communityPlatform.communityModerators.create(
    communityOwnerConnection,
    {
      body: {
        communityId: communityB.id,
        moderatorUserId: moderatorAuth.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );

  const post = await api.functional.communityPlatform.member.posts.create(
    reporterConnection,
    {
      body: {
        community_id: communityB.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );

  const postId = typia.assert<string & tags.Format<"uuid">>(
    (post as unknown as { id?: string | undefined }).id ?? "",
  );

  const reason = RandomGenerator.paragraph({ sentences: 1 });
  const createdReport =
    await api.functional.communityPlatform.member.reports.create(
      reporterConnection,
      {
        body: {
          communityId: communityB.id,
          targetType: "post",
          targetId: postId,
          reason,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(createdReport);
  const reportId = createdReport.id;
  const successReport =
    await api.functional.communityPlatform.member.reports.at(
      moderatorConnection,
      { reportId },
    );
  typia.assert(successReport);
  TestValidator.equals("report id matches", successReport.id, reportId);
  TestValidator.equals(
    "community id matches",
    successReport.community.id,
    communityB.id,
  );
  TestValidator.equals(
    "target type matches",
    successReport.targetType,
    createdReport.targetType,
  );
  TestValidator.equals(
    "target id matches",
    successReport.targetId,
    createdReport.targetId,
  );
  TestValidator.equals("reason matches", successReport.reason, reason);
  TestValidator.equals(
    "reporter id matches",
    successReport.reporter.id,
    reporterAuth.id,
  );
  if (successReport.resolution === null) {
    TestValidator.equals("resolution is null", successReport.resolution, null);
  } else {
    typia.assert(successReport.resolution);
    TestValidator.equals(
      "resolution report id matches",
      successReport.resolution.communityPlatformReportId,
      reportId,
    );
  }
  await TestValidator.httpError(
    "non-moderator denied without leaking report details",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.member.reports.at(
        nonModeratorConnection,
        { reportId },
      );
    },
  );
  void communityA;
}
