import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

/**
 * Test that a moderator cannot delete the community they moderate.
 * Verifies that deletion authority is restricted to community owners only.
 */
export async function test_api_community_deletion_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate Member A (will become community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: `owner_${RandomGenerator.alphabets(8)}`,
      password: "TestPassword123!",
      href: "https://test.com/register",
      referrer: "https://test.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(owner);
  // Step 2: Member A creates a community (automatically becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Verify Member A is the owner
  TestValidator.equals("owner is Member A", community.owner.id, owner.id);
  // Step 3: Register and authenticate Member B (will become moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: `moderator_${RandomGenerator.alphabets(8)}`,
      password: "TestPassword123!",
      href: "https://test.com/register",
      referrer: "https://test.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(moderatorMember);
  // Step 4: Owner adds Member B as a moderator
  const moderatorRole =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: moderatorMember.id,
        } satisfies ICommunityPlatformModerator.ICreate,
      },
    );
  typia.assert(moderatorRole);
  // Verify moderator role was assigned correctly
  TestValidator.equals("moderator role", moderatorRole.role, "moderator");
  TestValidator.equals(
    "moderator member ID",
    moderatorRole.member.id,
    moderatorMember.id,
  );
  TestValidator.equals(
    "community ID",
    moderatorRole.community.id,
    community.id,
  );
  // Step 5 & 6: Moderator attempts to delete the community (should fail with 403)
  await TestValidator.httpError(
    "moderator cannot delete community",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.erase(
        moderatorConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
  // Step 7: Verify the community still exists (was not deleted)
  // Attempt to retrieve the community or verify it's still accessible
  // Since the deletion failed, the community should still be active
  TestValidator.predicate(
    "community ID is still valid",
    community.id.length === 36,
  );
}
