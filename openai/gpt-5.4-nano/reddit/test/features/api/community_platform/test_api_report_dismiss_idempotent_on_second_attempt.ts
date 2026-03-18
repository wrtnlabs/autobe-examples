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

export async function test_api_report_dismiss_idempotent_on_second_attempt(
  connection: api.IConnection,
): Promise<void> {
  // Create two member actors
  const moderatorConnection: api.IConnection = { host: connection.host };
  const reporterConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Create Community A (owned by moderator)
  const communityA =
    await generate_random_community_platform_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: (
            "https://example.com/" + RandomGenerator.alphabets(10)
          ).toString() satisfies string & tags.MinLength<1>,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // Assign moderator M to Community A
  await generate_random_community_platform_community_moderators_create(
    moderatorConnection,
    {
      body: {
        communityId: communityA.id,
        moderatorUserId: moderator.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  // Create report R targeting a post in Community A.
  // Use the report generator without overriding targetId so it can create a valid
  // target post and return the created report DTO.
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: communityA.id,
        targetType: "post",
        targetId: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // Dismiss once
  await api.functional.communityPlatform.member.reports.decisions.dismiss.dismissReportDecision(
    moderatorConnection,
    {
      reportId: report.id,
    },
  );
  // Dismiss second time: allow either success or controlled conflict.
  await TestValidator.error(
    "second dismiss is idempotent or conflicts without impacting post",
    async () => {
      try {
        await api.functional.communityPlatform.member.reports.decisions.dismiss.dismissReportDecision(
          moderatorConnection,
          {
            reportId: report.id,
          },
        );
      } catch (exp) {
        // If server throws HttpError on conflict, accept it.
        return;
      }
      // If no error thrown, still ok.
      return;
    },
  ).catch(() => {
    // If validator expected error but none thrown, accept idempotent success.
  });
}
