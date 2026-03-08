import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { generate_random_community_platform_member_communities_moderators_add_moderator } from "../../../generate/generate_random_community_platform_member_communities_moderators_add_moderator";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_ban_owner_immunity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A (owner) joins and creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Verify owner is the authenticated member
  TestValidator.equals("community owner", community.owner.id, ownerAuth.id);
  // Step 2: Member B (moderator) joins the platform
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  // Step 3: Owner appoints Member B as moderator
  const moderatorRecord =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: {
          username: moderatorAuth.username,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorRecord);
  // Verify moderator was assigned correctly
  TestValidator.equals(
    "moderator assigned",
    moderatorRecord.member.id,
    moderatorAuth.id,
  );
  // Step 4: Moderator attempts to ban the owner - should FAIL with 403
  await TestValidator.httpError(
    "moderator cannot ban community owner",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.bans.create(
        moderatorConnection,
        {
          communityName: community.name,
          body: {
            bannedUserId: ownerAuth.id,
            reason: "Attempt to ban the community owner",
          } satisfies ICommunityPlatformCommunityBan.ICreate,
        },
      );
    },
  );
}
