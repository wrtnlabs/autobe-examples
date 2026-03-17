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

export async function test_api_moderation_action_ban_detail_cross_community_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoin);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(adminLogin);
  const owner1Connection: api.IConnection = { host: connection.host };
  const owner1 = await authorize_member_join(owner1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner1);
  const community1 =
    await generate_random_community_platform_member_communities_create(
      owner1Connection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(12)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(community1);
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_member_join(moderator1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderator1);
  const moderatorAssignment1 =
    await generate_random_community_platform_member_communities_moderators_create(
      owner1Connection,
      {
        params: {
          communitySlug: community1.id,
        },
        body: {
          member_code: moderator1.code,
        },
      },
    );
  typia.assert(moderatorAssignment1);
  const bannedMember1Connection: api.IConnection = { host: connection.host };
  const bannedMember1 = await authorize_member_join(bannedMember1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(bannedMember1);
  const ban1 =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId: community1.id,
        },
        body: {
          community_platform_member_id: bannedMember1.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          started_at: new Date().toISOString(),
          expired_at: null,
        },
      },
    );
  typia.assert(ban1);
  const owner2Connection: api.IConnection = { host: connection.host };
  const owner2 = await authorize_member_join(owner2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner2);
  const community2 =
    await generate_random_community_platform_member_communities_create(
      owner2Connection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(12)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(community2);
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_member_join(moderator2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderator2);
  const moderatorAssignment2 =
    await generate_random_community_platform_member_communities_moderators_create(
      owner2Connection,
      {
        params: {
          communitySlug: community2.id,
        },
        body: {
          member_code: moderator2.code,
        },
      },
    );
  typia.assert(moderatorAssignment2);
  const bannedMember2Connection: api.IConnection = { host: connection.host };
  const bannedMember2 = await authorize_member_join(bannedMember2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(bannedMember2);
  const ban2 =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId: community2.id,
        },
        body: {
          community_platform_member_id: bannedMember2.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          started_at: new Date().toISOString(),
          expired_at: null,
        },
      },
    );
  typia.assert(ban2);
  const actionPage1 =
    await api.functional.communityPlatform.member.communities.moderationActions.index(
      moderator1Connection,
      {
        communityId: community1.id,
        body: {
          target_type: "ban",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(actionPage1);
  const action1 = actionPage1.data.find(
    (candidate) =>
      candidate.targetType === "ban" && candidate.targetId === ban1.id,
  );
  const safeAction1 = typia.assert<NonNullable<typeof action1>>(action1);
  const banPage1 =
    await api.functional.communityPlatform.member.communities.moderationActions.bans.index(
      moderator1Connection,
      {
        communityId: community1.id,
        moderationActionId: safeAction1.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationActionBan.IRequest,
      },
    );
  typia.assert(banPage1);
  const linkage1 = banPage1.data.find(
    (candidate) => candidate.communityBan.id === ban1.id,
  );
  const safeLinkage1 = typia.assert<NonNullable<typeof linkage1>>(linkage1);
  const actionPage2 =
    await api.functional.communityPlatform.member.communities.moderationActions.index(
      moderator2Connection,
      {
        communityId: community2.id,
        body: {
          target_type: "ban",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(actionPage2);
  const action2 = actionPage2.data.find(
    (candidate) =>
      candidate.targetType === "ban" && candidate.targetId === ban2.id,
  );
  const safeAction2 = typia.assert<NonNullable<typeof action2>>(action2);
  const banPage2 =
    await api.functional.communityPlatform.member.communities.moderationActions.bans.index(
      moderator2Connection,
      {
        communityId: community2.id,
        moderationActionId: safeAction2.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationActionBan.IRequest,
      },
    );
  typia.assert(banPage2);
  const linkage2 = banPage2.data.find(
    (candidate) => candidate.communityBan.id === ban2.id,
  );
  const safeLinkage2 = typia.assert<NonNullable<typeof linkage2>>(linkage2);
  const detail =
    await api.functional.communityPlatform.member.communities.moderationActions.bans.at(
      moderator1Connection,
      {
        communityId: community1.id,
        moderationActionId: safeAction1.id,
        moderationActionBanId: safeLinkage1.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("matched linkage id", detail.id, safeLinkage1.id);
  TestValidator.equals(
    "matched moderation action id",
    detail.moderationAction.id,
    safeAction1.id,
  );
  TestValidator.equals("matched ban id", detail.communityBan.id, ban1.id);
  await TestValidator.error(
    "rejects community1 with community2 action and linkage",
    async () => {
      await api.functional.communityPlatform.member.communities.moderationActions.bans.at(
        moderator1Connection,
        {
          communityId: community1.id,
          moderationActionId: safeAction2.id,
          moderationActionBanId: safeLinkage2.id,
        },
      );
    },
  );
  await TestValidator.error(
    "rejects valid community1 action with community2 linkage",
    async () => {
      await api.functional.communityPlatform.member.communities.moderationActions.bans.at(
        moderator1Connection,
        {
          communityId: community1.id,
          moderationActionId: safeAction1.id,
          moderationActionBanId: safeLinkage2.id,
        },
      );
    },
  );
  await TestValidator.error(
    "rejects community2 scope with community1 action and linkage",
    async () => {
      await api.functional.communityPlatform.member.communities.moderationActions.bans.at(
        moderator2Connection,
        {
          communityId: community2.id,
          moderationActionId: safeAction1.id,
          moderationActionBanId: safeLinkage1.id,
        },
      );
    },
  );
}
