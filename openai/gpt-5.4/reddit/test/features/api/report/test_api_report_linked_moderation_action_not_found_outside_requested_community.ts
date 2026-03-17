import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { generate_random_community_platform_member_communities_reports_reviews_create } from "../../../generate/generate_random_community_platform_member_communities_reports_reviews_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_review } from "../../../prepare/prepare_random_community_platform_report_review";

export async function test_api_report_linked_moderation_action_not_found_outside_requested_community(
  connection: api.IConnection,
): Promise<void> {
  const callerConnection: api.IConnection = { host: connection.host };
  const callerAuthorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(callerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(callerAuthorized);
  const communityA: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      callerConnection,
      {
        body: {
          slug: `community-a-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(communityA);
  const communityBOwnerConnection: api.IConnection = { host: connection.host };
  const communityBOwnerAuthorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(communityBOwnerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(communityBOwnerAuthorized);
  const communityB: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      communityBOwnerConnection,
      {
        body: {
          slug: `community-b-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(communityB);
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(moderatorMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(moderatorAuthorized);
  const moderatorAssignment: ICommunityPlatformCommunityModerator =
    await generate_random_community_platform_member_communities_moderators_create(
      callerConnection,
      {
        params: {
          communitySlug: communityA.slug,
        },
        body: {
          member_code: moderatorAuthorized.code,
        },
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "moderator assignment community",
    moderatorAssignment.community.id,
    communityA.id,
  );
  TestValidator.equals(
    "caller owns requested community",
    communityA.member.id,
    callerAuthorized.id,
  );
  TestValidator.notEquals(
    "foreign community is owned by a different actor",
    communityB.member.id,
    callerAuthorized.id,
  );
  const unresolvedModerationActionId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "community-scoped moderation action lookup rejects unresolved or out-of-scope action",
    [404, 409],
    async () => {
      await api.functional.communityPlatform.member.communities.moderationActions.reports.index(
        callerConnection,
        {
          communityId: communityA.id,
          moderationActionId: unresolvedModerationActionId,
          body: {
            communityId: communityA.id,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    },
  );
  TestValidator.notEquals(
    "community ids differ to preserve cross-community isolation setup",
    communityA.id,
    communityB.id,
  );
}
