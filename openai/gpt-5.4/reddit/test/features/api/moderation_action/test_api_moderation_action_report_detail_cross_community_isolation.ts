import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionReport";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderation_action_report_detail_cross_community_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const communityABody = {
    slug: `community-a-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityA =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: communityABody,
      },
    );
  typia.assert(communityA);
  const communityBBody = {
    slug: `community-b-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityB =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: communityBBody,
      },
    );
  typia.assert(communityB);
  TestValidator.notEquals(
    "communities must have distinct ids",
    communityA.id,
    communityB.id,
  );
  TestValidator.notEquals(
    "communities must have distinct slugs",
    communityA.slug,
    communityB.slug,
  );
  const randomModerationActionIdA = typia.random<
    string & tags.Format<"uuid">
  >();
  const randomModerationActionReportIdA = typia.random<
    string & tags.Format<"uuid">
  >();
  const randomModerationActionIdB = typia.random<
    string & tags.Format<"uuid">
  >();
  const randomModerationActionReportIdB = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "community A scope denies unresolved moderation report detail access",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.member.communities.moderationActions.reports.at(
        memberConnection,
        {
          communityId: communityA.id,
          moderationActionId: randomModerationActionIdA,
          moderationActionReportId: randomModerationActionReportIdA,
        },
      );
    },
  );
  await TestValidator.httpError(
    "community B scope also denies unresolved moderation report detail access",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.member.communities.moderationActions.reports.at(
        memberConnection,
        {
          communityId: communityB.id,
          moderationActionId: randomModerationActionIdB,
          moderationActionReportId: randomModerationActionReportIdB,
        },
      );
    },
  );
}
