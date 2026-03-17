import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanAssignment";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBanAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_ban_assignment_retrieval_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for first member (owner/moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  // Register first member with authorize_member_join utility
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // Update owner connection with authorization headers
  ownerConnection.headers = { Authorization: ownerAuth.token.access };
  // Create community with generate_random_community_platform_member_communities_create utility
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create actor-specific connection for second member (regular member to be banned)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  // Register second member with authorize_member_join utility
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // Update banned member connection with authorization headers
  bannedMemberConnection.headers = {
    Authorization: bannedMemberAuth.token.access,
  };
  // Create ban with generate_random_community_platform_member_bans_create utility
  const ban = await generate_random_community_platform_member_bans_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        memberId: bannedMemberAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expiresAt: null,
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(ban);
  // Create actor-specific connection for third member (regular member, unauthorized)
  const unauthorizedMemberConnection: api.IConnection = {
    host: connection.host,
  };
  // Register third member with authorize_member_join utility
  const unauthorizedMemberAuth = await authorize_member_join(
    unauthorizedMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(unauthorizedMemberAuth);
  // Update unauthorized member connection with authorization headers
  unauthorizedMemberConnection.headers = {
    Authorization: unauthorizedMemberAuth.token.access,
  };
  // Attempt to retrieve ban assignments as unauthorized member - should fail with 403
  await TestValidator.error(
    "regular member cannot retrieve ban assignments without moderator role",
    async () => {
      const assignments =
        await api.functional.communityPlatform.member.bans.assignments.index(
          unauthorizedMemberConnection,
          {
            communityId: community.id,
            banId: ban.id,
            body: {
              search: undefined,
              created_at_from: undefined,
              created_at_to: undefined,
              updated_at_from: undefined,
              updated_at_to: undefined,
              page: undefined,
              limit: undefined,
              sort: undefined,
              order: undefined,
            } satisfies ICommunityPlatformBanAssignment.IRequest,
          },
        );
      typia.assert(assignments);
    },
  );
}
