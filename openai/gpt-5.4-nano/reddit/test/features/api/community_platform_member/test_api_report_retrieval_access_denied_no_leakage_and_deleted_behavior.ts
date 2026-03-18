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

export async function test_api_report_retrieval_access_denied_no_leakage_and_deleted_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Actor connections
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Create two communities X (memberA owns) and Y (memberB owns)
  const communityX =
    await generate_random_community_platform_communities_create(
      memberAConnection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<65535>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityX);
  const communityY =
    await generate_random_community_platform_communities_create(
      memberBConnection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<65535>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityY);
  // Grant memberA moderation rights on community X
  await generate_random_community_platform_community_moderators_create(
    memberAConnection,
    {
      body: {
        communityId: communityX.id,
        moderatorUserId: (memberAConnection.headers?.Authorization
          ? undefined
          : undefined) as never,
      } as never,
    },
  );
  // The generator above cannot set moderatorUserId without memberA id.
  // We need memberA id from authorization result. Re-authorize to capture it.
  const memberA = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  // Re-create community X owned by memberA to keep moderator consistency
  const communityX2 =
    await generate_random_community_platform_communities_create(
      { host: connection.host },
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<65535>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityX2);
  await generate_random_community_platform_community_moderators_create(
    { host: connection.host },
    {
      body: {
        communityId: communityX2.id,
        moderatorUserId: memberA.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  // Create a report in community Y as memberB; helper should prepare a valid target and return report with id.
  const report = await generate_random_community_platform_member_reports_create(
    memberBConnection,
    {
      body: {
        communityId: communityY.id,
      } as DeepPartial<ICommunityPlatformReport.ICreate>,
    },
  );
  typia.assert(report);
  // Access as memberA (moderator of X) must be denied and must not leak report details.
  await TestValidator.error(
    "report retrieval must be denied without leaking details",
    async () => {
      try {
        await api.functional.communityPlatform.member.reports.at(
          { host: connection.host },
          {
            reportId: report.id,
          },
        );
        throw new Error("expected error");
      } catch (e) {
        const httpErr = e;
        if (!typia.is<api.HttpError>(httpErr)) throw e;
        const msg = httpErr.message;
        TestValidator.predicate(
          "does not leak reporter identity or reason",
          !msg.includes(memberB.id) && !msg.includes(report.reason),
        );
        TestValidator.predicate(
          "does not leak snapshot/resolution fields",
          !msg.includes("snap") &&
            !msg.includes("resolution") &&
            !msg.includes("reason"),
        );
        throw e;
      }
    },
  );
  // Delete the report as the reporter
  await api.functional.communityPlatform.member.reports.erase(
    memberBConnection,
    {
      reportId: report.id,
    },
  );
  // After deletion, retrieval as memberA again must be denied consistently and without stale leakage.
  await TestValidator.error(
    "deleted report retrieval must remain denied without leaking stale details",
    async () => {
      try {
        await api.functional.communityPlatform.member.reports.at(
          { host: connection.host },
          {
            reportId: report.id,
          },
        );
        throw new Error("expected error");
      } catch (e) {
        const httpErr = e;
        if (!typia.is<api.HttpError>(httpErr)) throw e;
        const msg = httpErr.message;
        TestValidator.predicate(
          "does not leak reporter identity or reason after deletion",
          !msg.includes(memberB.id) && !msg.includes(report.reason),
        );
        throw e;
      }
    },
  );
}
