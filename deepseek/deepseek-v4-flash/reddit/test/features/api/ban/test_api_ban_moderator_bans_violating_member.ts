import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

/**
 * Test that an appointed moderator can ban a member from the community.
 *
 * Validates the moderator ban workflow by having a community owner appoint a moderator who then bans a violating member. Ensures the ban record correctly identifies the banning moderator, the banned member, and the target community.
 *
 * 1. Register member A (becomes community owner).
 * 2. Member A creates a community.
 * 3. Register member B (to be appointed as moderator).
 * 4. Member A appoints member B as moderator.
 * 5. Register member C (the member to be banned).
 * 6. Moderator B bans member C from the community.
 * 7. Validate that the ban record correctly identifies moderator B as the banning authority, member C as the banned user, and the correct community scope.
 */
export async function test_api_ban_moderator_bans_violating_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Register member B (will be appointed as moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Member A appoints member B as moderator
  const moderator =
    await generate_random_community_platform_member_moderators_create(
      memberAConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: memberB.username,
        },
      },
    );
  typia.assert(moderator);
  TestValidator.equals(
    "moderator role is moderator",
    moderator.role,
    "moderator",
  );
  // 5. Register member C (will be banned)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // 6. Moderator B bans member C from the community
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      memberBConnection,
      {
        body: {
          member_id: memberC.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(ban);
  // 7. Validate the ban record
  // 7.1. The banning moderator is B (the appointed moderator), not A
  TestValidator.equals(
    "banning moderator is member B",
    ban.bannedBy.id,
    memberB.id,
  );
  // 7.2. The banned member is C
  TestValidator.equals(
    "banned member is member C",
    ban.bannedMember.id,
    memberC.id,
  );
  // 7.3. The ban is scoped to the correct community
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  // 7.4. Ban reason is non-empty
  TestValidator.predicate(
    "ban reason is provided",
    () => ban.reason.length > 0,
  );
}
