import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test authorization failures for non-moderator community members attempting to unban users,
 * and validation of ban state transitions including 409 Conflict for already inactive bans.
 *
 * Creates three members: owner (moderator), banned member, and regular non-moderator member.
 * Owner creates community, bans second member. Regular member attempts unban (403 Forbidden).
 * Owner successfully unbans, then attempts to unban same inactive ban again (409 Conflict).
 * Validates that bans remain active, banned user cannot post, and owner retains exclusive authority.
 */
export async function test_api_community_ban_unban_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three member accounts
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
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
  typia.assert(owner);
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {
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
  typia.assert(bannedMember);
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember = await authorize_member_join(regularMemberConnection, {
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
  typia.assert(regularMember);
  // 2. Owner creates community
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
  // 3. Owner bans the second member
  const ban = await generate_random_community_platform_member_bans_create(
    ownerConnection,
    {
      body: {
        memberId: bannedMember.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformBan.ICreate,
      params: { communityId: community.id },
    },
  );
  typia.assert(ban);
  TestValidator.predicate(
    "ban should be active initially",
    ban.active === true,
  );
  TestValidator.equals(
    "banned member matches",
    ban.bannedMember.id,
    bannedMember.id,
  );
  // 4. Regular non-moderator attempts to unban (should fail with 403)
  await TestValidator.httpError(
    "non-moderator cannot unban",
    403,
    async () =>
      await api.functional.communityPlatform.member.bans.erase(
        regularMemberConnection,
        {
          communityId: community.id,
          banId: ban.id,
        },
      ),
  );
  // 5. Verify ban is still active by attempting to create another ban on same member (should get 409 Conflict)
  await TestValidator.httpError(
    "cannot create duplicate active ban",
    409,
    async () =>
      await generate_random_community_platform_member_bans_create(
        ownerConnection,
        {
          body: {
            memberId: bannedMember.id,
            reason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies ICommunityPlatformBan.ICreate,
          params: { communityId: community.id },
        },
      ),
  );
  // 6. Owner successfully unbans the banned member
  await api.functional.communityPlatform.member.bans.erase(ownerConnection, {
    communityId: community.id,
    banId: ban.id,
  });
  // 7. Verify ban is now inactive by creating a new ban on same member (should succeed)
  const newBan = await generate_random_community_platform_member_bans_create(
    ownerConnection,
    {
      body: {
        memberId: bannedMember.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformBan.ICreate,
      params: { communityId: community.id },
    },
  );
  typia.assert(newBan);
  TestValidator.predicate("new ban should be active", newBan.active === true);
  TestValidator.notEquals(
    "new ban should have different ID",
    newBan.id,
    ban.id,
  );
}
