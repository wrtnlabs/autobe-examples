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

export async function test_api_report_dismiss_forbidden_for_wrong_moderator(
  connection: api.IConnection,
): Promise<void> {
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorAAuth = await authorize_member_join(moderatorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const moderatorBAuth = await authorize_member_join(moderatorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const communityA =
    await generate_random_community_platform_communities_create(
      moderatorAConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  await generate_random_community_platform_community_moderators_create(
    moderatorAConnection,
    {
      body: {
        communityId: communityA.id,
        moderatorUserId: moderatorAAuth.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  const communityB =
    await generate_random_community_platform_communities_create(
      moderatorBConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon2.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  await generate_random_community_platform_community_moderators_create(
    moderatorBConnection,
    {
      body: {
        communityId: communityB.id,
        moderatorUserId: moderatorBAuth.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const reason = RandomGenerator.paragraph({ sentences: 1 });
  // Create a moderation report in Community A.
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: communityA.id,
        // generator prepares a compatible target_type/target_id and validates they belong to the community
        reason,
      },
    },
  );
  typia.assert(report);
  // Wrong-community moderator cannot dismiss the report.
  await TestValidator.error(
    "wrong-community moderator cannot dismiss report",
    async () => {
      await api.functional.communityPlatform.member.reports.decisions.dismiss.dismissReportDecision(
        moderatorBConnection,
        { reportId: report.id },
      );
    },
  );
  // Since there is no report retrieval endpoint in the provided SDK list,
  // we only assert the report was unresolved at creation time.
  TestValidator.equals(
    "report is initially unresolved",
    report.resolution,
    null,
  );
}
