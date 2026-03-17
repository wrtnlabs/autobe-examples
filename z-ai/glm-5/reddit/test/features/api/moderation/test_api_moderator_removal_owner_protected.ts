import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderator_removal_owner_protected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that the community owner cannot be removed from their moderator role.
   * The owner's moderator role is protected and permanent.
   */
  // Step 1: Create member account (will become the community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: "https://test.com/join",
      referrer: "https://test.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // Step 2: Create community (creator becomes owner with protected moderator role)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Verify owner is the creator
  TestValidator.equals("owner is creator", community.owner.id, ownerAuth.id);
  // Step 4: Owner attempts to remove their own moderator record
  // This should fail because the owner's moderator role is protected
  await TestValidator.httpError(
    "owner cannot remove their own moderator role",
    [400, 403],
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.erase(
        ownerConnection,
        {
          communityId: community.id,
          moderatorId: ownerAuth.id,
        },
      );
    },
  );
}
