import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate admin-privileged removal of a moderator assignment in a community,
 * enforcing business constraints.
 *
 * Steps:
 *
 * 1. Register a new admin for authorization context.
 * 2. Create a new community.
 * 3. Assign at least two moderators to the community (simulate their user_id
 *    values).
 * 4. Remove one moderator assignment by id and confirm successful removal.
 * 5. Attempt to remove the final remaining moderator and confirm error is thrown
 *    as business rule violation.
 */
export async function test_api_moderator_assignment_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = RandomGenerator.alphabets(5) + "@admin.test";
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail as string & tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.MinLength<8>,
        display_name: RandomGenerator.name(2) as string &
          tags.MinLength<1> &
          tags.MaxLength<80>,
        href: "https://test-suite.example.com" as string & tags.Format<"uri">,
        referrer: "https://referrer.example.com",
        ip: undefined,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10) as string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">,
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
          }) as string & tags.MinLength<1> & tags.MaxLength<250>,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Assign two moderators (simulate user_id values as UUID)
  const userIdA = typia.random<string & tags.Format<"uuid">>();
  const userIdB = typia.random<string & tags.Format<"uuid">>();

  const modA: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          user_id: userIdA,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(modA);

  const modB: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          user_id: userIdB,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(modB);

  // 4. Remove modA from moderator assignments
  await api.functional.communityPlatform.admin.communities.moderators.erase(
    connection,
    {
      communityId: community.id,
      moderatorId: modA.id,
    },
  );
  // If no error, removal is considered successful

  // 5. Try removing modB (should fail since they are the last moderator)
  await TestValidator.error(
    "should not allow removing last community moderator",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.erase(
        connection,
        {
          communityId: community.id,
          moderatorId: modB.id,
        },
      );
    },
  );
}
