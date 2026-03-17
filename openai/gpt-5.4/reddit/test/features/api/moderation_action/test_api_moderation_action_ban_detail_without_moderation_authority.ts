import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionBan";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";
import type { IPageICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_admin_communities_bans_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_moderation_action_ban_detail_without_moderation_authority(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuthorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(community);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorAuthorized);
  const moderatorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: {
          member_code: moderatorAuthorized.code,
        },
      },
    );
  typia.assert(moderatorAssignment);
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuthorized = await authorize_member_join(
    bannedMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(bannedMemberAuthorized);
  const createdBan =
    await generate_random_community_platform_admin_communities_bans_create(
      moderatorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          community_platform_member_id: bannedMemberAuthorized.id,
          reason: RandomGenerator.content({ paragraphs: 1 }),
          started_at: new Date().toISOString(),
          expired_at: null,
        },
      },
    );
  typia.assert(createdBan);
  const moderationActionsPage =
    await api.functional.communityPlatform.member.communities.moderationActions.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          target_type: "ban",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(moderationActionsPage);
  const foundModerationAction = moderationActionsPage.data.find(
    (action) =>
      action.targetType === "ban" && action.targetId === createdBan.id,
  );
  TestValidator.predicate(
    "ban moderation action exists for created ban",
    foundModerationAction !== undefined,
  );
  const moderationAction = typia.assert(foundModerationAction!);
  const moderationActionBansPage =
    await api.functional.communityPlatform.member.communities.moderationActions.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        moderationActionId: moderationAction.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationActionBan.IRequest,
      },
    );
  typia.assert(moderationActionBansPage);
  const foundModerationActionBan = moderationActionBansPage.data.find(
    (entry) => entry.communityBan.id === createdBan.id,
  );
  TestValidator.predicate(
    "moderation action ban linkage exists for created ban",
    foundModerationActionBan !== undefined,
  );
  const moderationActionBan = typia.assert(foundModerationActionBan!);
  const outsiderConnection: api.IConnection = { host: connection.host };
  const outsiderAuthorized = await authorize_member_join(outsiderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(outsiderAuthorized);
  await TestValidator.httpError(
    "outsider cannot inspect moderation action ban detail without moderation authority",
    [401, 403, 404],
    async () => {
      await api.functional.communityPlatform.member.communities.moderationActions.bans.at(
        outsiderConnection,
        {
          communityId: community.id,
          moderationActionId: moderationAction.id,
          moderationActionBanId: moderationActionBan.id,
        },
      );
    },
  );
}
