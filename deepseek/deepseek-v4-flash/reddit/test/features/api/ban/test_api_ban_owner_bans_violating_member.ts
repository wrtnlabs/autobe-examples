import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test that a community owner can ban a violating member from their community.
 *
 * Validates the complete ban workflow: owner registration, community creation, target member registration, and the ban operation. After a successful ban, verifies that the ban record correctly references the community, the banned member, the banning moderator (owner), and the provided reason.
 *
 * Also validates the unique constraint by attempting a duplicate ban, which is expected to fail with a 409 Conflict error.
 *
 * Since post and comment creation APIs are not available in the current SDK, the post-ban participation restrictions cannot be tested against live endpoints. Only the core ban creation and uniqueness enforcement are validated.
 *
 * 1. Member A joins the platform and becomes an authenticated member.
 * 2. Member A creates a community, becoming its owner.
 * 3. Member B joins the platform as a separate authenticated member.
 * 4. Owner A bans member B from the community with a descriptive reason.
 * 5. Validates the ban record structure and field accuracy.
 * 6. Attempts a duplicate ban — expects 409 Conflict due to unique constraint.
 */
export async function test_api_ban_owner_bans_violating_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Create a community as member A
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Register member B (will be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 4. Owner A bans member B from the community
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      memberAConnection,
      {
        body: {
          member_id: memberB.id,
          reason,
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(ban);
  // 5. Validate ban record fields
  TestValidator.equals(
    "ban community name",
    ban.community.name,
    community.name,
  );
  TestValidator.equals("banned member id", ban.bannedMember.id, memberB.id);
  TestValidator.equals("banning moderator id", ban.bannedBy.id, memberA.id);
  TestValidator.equals("ban reason", ban.reason, reason);
  // 6. Duplicate ban attempt must be rejected
  await TestValidator.httpError("duplicate ban rejected", 409, async () => {
    await generate_random_community_platform_member_communities_bans_create(
      memberAConnection,
      {
        body: {
          member_id: memberB.id,
          reason,
        },
        params: {
          communityName: community.name,
        },
      },
    );
  });
}
