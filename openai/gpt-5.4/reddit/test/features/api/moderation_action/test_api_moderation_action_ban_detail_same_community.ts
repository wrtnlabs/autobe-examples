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

export async function test_api_moderation_action_ban_detail_same_community(
  connection: api.IConnection,
): Promise<void> {
  const ownerPassword = "OwnerPass1234!" as string & tags.Format<"password">;
  const moderatorPassword = "ModeratorPass1234!" as string &
    tags.Format<"password">;
  const bannedMemberPassword = "BannedPass1234!" as string &
    tags.Format<"password">;
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: ownerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(12)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorAuth);
  const moderatorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: {
          member_code: moderatorAuth.code,
        },
      },
    );
  typia.assert(moderatorAssignment);
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: bannedMemberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(bannedMemberAuth);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  const startedAt = new Date().toISOString();
  const expiredAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const createdBan =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          community_platform_member_id: bannedMemberAuth.id,
          reason: banReason,
          started_at: startedAt,
          expired_at: expiredAt,
        },
      },
    );
  typia.assert(createdBan);
  const moderationActions =
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
  typia.assert(moderationActions);
  const moderationActionSummary = moderationActions.data.find(
    (candidate) =>
      candidate.targetId === createdBan.id &&
      candidate.community.id === community.id,
  );
  TestValidator.predicate(
    "ban moderation action exists in same community",
    moderationActionSummary !== undefined,
  );
  const targetModerationAction = typia.assert(moderationActionSummary!);
  const moderationActionBans =
    await api.functional.communityPlatform.member.communities.moderationActions.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        moderationActionId: targetModerationAction.id,
        body: {
          search: banReason,
          status: createdBan.status,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationActionBan.IRequest,
      },
    );
  typia.assert(moderationActionBans);
  const moderationActionBanSummary = moderationActionBans.data.find(
    (candidate) => candidate.communityBan.id === createdBan.id,
  );
  TestValidator.predicate(
    "ban linkage summary exists under moderation action",
    moderationActionBanSummary !== undefined,
  );
  const targetModerationActionBan = typia.assert(moderationActionBanSummary!);
  const detail =
    await api.functional.communityPlatform.member.communities.moderationActions.bans.at(
      moderatorConnection,
      {
        communityId: community.id,
        moderationActionId: targetModerationAction.id,
        moderationActionBanId: targetModerationActionBan.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "detail linkage id",
    detail.id,
    targetModerationActionBan.id,
  );
  TestValidator.equals(
    "detail linkage created_at",
    detail.created_at,
    targetModerationActionBan.created_at,
  );
  TestValidator.equals(
    "detail linkage updated_at",
    detail.updated_at,
    targetModerationActionBan.updated_at,
  );
  TestValidator.equals(
    "detail linkage deleted_at",
    detail.deleted_at,
    targetModerationActionBan.deleted_at,
  );
  TestValidator.equals(
    "detail moderation action id",
    detail.moderationAction.id,
    targetModerationAction.id,
  );
  TestValidator.equals(
    "detail moderation action community id",
    detail.moderationAction.community.id,
    community.id,
  );
  TestValidator.equals(
    "detail moderation actor assignment id",
    detail.moderationAction.communityModerator.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "detail moderation action moderator member id",
    detail.moderationAction.communityModerator.member.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "detail moderation action moderator community id",
    detail.moderationAction.communityModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "detail community ban id",
    detail.communityBan.id,
    createdBan.id,
  );
  TestValidator.equals(
    "detail community ban community id",
    detail.communityBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "detail banned member id",
    detail.communityBan.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "detail community ban reason",
    detail.communityBan.reason,
    createdBan.reason,
  );
  TestValidator.equals(
    "detail community ban status",
    detail.communityBan.status,
    createdBan.status,
  );
  TestValidator.equals(
    "detail community ban started_at",
    detail.communityBan.started_at,
    createdBan.started_at,
  );
  TestValidator.equals(
    "detail community ban expired_at",
    detail.communityBan.expired_at,
    createdBan.expired_at,
  );
}
