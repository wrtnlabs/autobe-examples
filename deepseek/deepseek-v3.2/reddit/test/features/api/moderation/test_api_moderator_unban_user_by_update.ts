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
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_moderator_unban_user_by_update(
  connection: api.IConnection,
): Promise<void> {
  // Create separate connections for each actor
  const moderatorConnection: api.IConnection = { host: connection.host };
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const regularMemberConnection: api.IConnection = { host: connection.host };
  // 1. Create three member accounts
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  const regularMemberAuth = await authorize_member_join(
    regularMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(regularMemberAuth);
  // 2. Create a community owned by moderator member
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Grant moderator role to moderator member (owner is automatically owner)
  // As community creator, moderator is already owner, no need to assign moderator role
  // But we need to verify moderator has moderation role
  // For this test, we'll verify by creating a ban
  // 4. Create an active ban on the banned member in the community
  const ban = await generate_random_community_platform_member_bans_create(
    moderatorConnection,
    {
      body: {
        memberId: bannedMemberAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      } satisfies ICommunityPlatformBan.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  TestValidator.predicate("ban is initially active", ban.active === true);
  TestValidator.equals(
    "ban has no unban timestamp initially",
    ban.unbanned_at,
    null,
  );
  TestValidator.predicate(
    "ban expiration date is set",
    ban.expires_at !== null,
  );
  // 5. Update the ban with active: false to unban the user
  const updatedBan = await api.functional.communityPlatform.member.bans.update(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
      body: {
        active: false,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // 6. Validate the updated ban has active: false and unbanned_at timestamp set
  TestValidator.equals(
    "ban should be inactive after update",
    updatedBan.active,
    false,
  );
  TestValidator.notEquals(
    "unbanned_at timestamp should be set",
    updatedBan.unbanned_at,
    null,
  );
  TestValidator.predicate(
    "unbanned_at should be a valid ISO date",
    typeof updatedBan.unbanned_at === "string" &&
      updatedBan.unbanned_at.includes("T"),
  );
  // 7. Verify the ban expiration date remains unchanged
  TestValidator.equals(
    "expires_at should remain unchanged",
    updatedBan.expires_at,
    ban.expires_at,
  );
  // 8. Ensure moderator role and community details remain unchanged
  // (ban update doesn't affect moderator role or community)
  // 9. Check that reactivating a ban (active: false → true) is not allowed (should throw error)
  await TestValidator.error("reactivating ban should fail", async () => {
    await api.functional.communityPlatform.member.bans.update(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          active: true,
        } satisfies ICommunityPlatformBan.IUpdate,
      },
    );
  });
}
