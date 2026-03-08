import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_add_moderator } from "../../../generate/generate_random_community_platform_member_communities_moderators_add_moderator";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (owner) joins and creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  // Store original updated_at for comparison
  const originalUpdatedAt = community.updatedAt;
  // 2. Member B (moderator) joins the platform
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {});
  // 3. Owner appoints Member B as moderator
  const moderatorRecord =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: moderatorAuth.username },
      },
    );
  typia.assert(moderatorRecord);
  // Wait a bit to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Moderator updates the community's description
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedCommunity =
    await api.functional.communityPlatform.member.communities.update(
      moderatorConnection,
      {
        communityName: community.name,
        body: {
          description: newDescription,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 5. Verify the update is successful
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    newDescription,
  );
  // 6. Verify the owner remains Member A (ownership unchanged)
  TestValidator.equals(
    "owner unchanged",
    updatedCommunity.owner.id,
    ownerAuth.id,
  );
  // 7. Verify updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at refreshed",
    new Date(updatedCommunity.updatedAt) > new Date(originalUpdatedAt),
  );
  // 8. Moderator removes the icon (set to null)
  const communityWithoutIcon =
    await api.functional.communityPlatform.member.communities.update(
      moderatorConnection,
      {
        communityName: community.name,
        body: { icon: null } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(communityWithoutIcon);
  // 9. Verify icon is successfully removed
  TestValidator.equals("icon removed", communityWithoutIcon.icon, null);
}
