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

export async function test_api_bans_temporary_with_expiration_date(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for different actors
  const ownerConnection: api.IConnection = { host: connection.host };
  const moderatorConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register three members: owner, moderator, and regular member
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  const regularMember = await authorize_member_join(memberConnection, {});
  typia.assert(regularMember);
  // 2. Owner creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Owner assigns moderator role to the moderator member
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        body: {
          memberId: moderator.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(moderationRole);
  TestValidator.equals(
    "moderator role assigned",
    moderationRole.roleType,
    "moderator",
  );
  // 4. Moderator creates temporary ban with future expiration date
  const futureExpiration = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days in future
  const temporaryBan =
    await generate_random_community_platform_member_bans_create(
      moderatorConnection,
      {
        body: {
          memberId: regularMember.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expiresAt: futureExpiration,
        } satisfies ICommunityPlatformBan.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(temporaryBan);
  // 5. Validate temporary ban properties
  TestValidator.equals(
    "ban has future expiration date",
    temporaryBan.expires_at,
    futureExpiration,
  );
  TestValidator.equals("ban is active", temporaryBan.active, true);
  TestValidator.equals("unbanned_at is null", temporaryBan.unbanned_at, null);
  TestValidator.equals("deleted_at is null", temporaryBan.deleted_at, null);
  TestValidator.equals(
    "banned member matches",
    temporaryBan.bannedMember.id,
    regularMember.id,
  );
  TestValidator.equals(
    "community matches",
    temporaryBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "issuing moderator role matches",
    temporaryBan.issuingModeratorRole.member.id,
    moderator.id,
  );
  TestValidator.predicate(
    "banned_at is recent",
    Date.now() - new Date(temporaryBan.banned_at).getTime() < 60000,
  );
  // 6. Test edge case: past expiration date should be rejected
  const pastExpiration = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days in past
  await TestValidator.error(
    "past expiration date should be rejected",
    async () => {
      await generate_random_community_platform_member_bans_create(
        moderatorConnection,
        {
          body: {
            memberId: regularMember.id,
            reason: RandomGenerator.paragraph({ sentences: 1 }),
            expiresAt: pastExpiration,
          } satisfies ICommunityPlatformBan.ICreate,
          params: { communityId: community.id },
        },
      );
    },
  );
}
