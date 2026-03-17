import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_bans_create } from "../../../generate/generate_random_community_platform_member_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

export async function test_api_community_ban_creation_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Owner creates a community (becomes owner with full authority)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorUser = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorUser);
  // 4. Owner appoints the moderator account as a moderator
  const moderatorRecord =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { memberId: moderatorUser.id },
      },
    );
  typia.assert(moderatorRecord);
  // Validate moderator role is "moderator" (not "owner")
  TestValidator.equals(
    "moderator role is moderator",
    moderatorRecord.role,
    "moderator",
  );
  // 5. Create a regular member account who will be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberToBan = await authorize_member_join(memberConnection, {});
  typia.assert(memberToBan);
  // 6. Moderator bans the regular member from the community
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: memberToBan.id,
          reason: banReason,
        },
      },
    );
  typia.assert(ban);
  // Validations
  TestValidator.equals("ban member matches", ban.member.id, memberToBan.id);
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  // Validate that the ban was issued by the appointed moderator, not the owner
  TestValidator.equals(
    "ban issued by appointed moderator",
    ban.moderator.id,
    moderatorRecord.id,
  );
  TestValidator.equals(
    "ban moderator member matches appointed moderator",
    ban.moderator.member.id,
    moderatorUser.id,
  );
  TestValidator.equals(
    "ban moderator role is moderator",
    ban.moderator.role,
    "moderator",
  );
  // Ensure ban was not issued by the community owner
  TestValidator.notEquals(
    "ban moderator is not the community owner",
    ban.moderator.member.id,
    owner.id,
  );
}
