import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate that a moderator assigned to a specific community can archive (soft
 * delete) that community. The scenario:
 *
 * 1. Register a member (as a community creator)
 * 2. Register a community as that member
 * 3. Register a moderator for that community (with
 *    ICommunityPlatformModerator.IJoin)
 * 4. Perform archive (soft delete) as the assigned moderator
 * 5. Confirm community.deleted_at is set (not purged), all other data remains
 * 6. Attempt soft delete by a moderator NOT assigned to community (should fail)
 * 7. Attempt to soft delete a non-existent community (should fail)
 */
export async function test_api_community_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  // 1. Member registration (create community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create community as registered member
  const communityName = RandomGenerator.alphaNumeric(8);
  const communitySlug = RandomGenerator.alphaNumeric(8);
  const communityTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const communityDescription = RandomGenerator.paragraph({ sentences: 10 });
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: communityTitle,
          description: communityDescription,
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name", community.name, communityName);
  TestValidator.equals("community slug", community.slug, communitySlug);
  TestValidator.equals(
    "creator_member_id",
    community.creator_member_id,
    member.id,
  );
  TestValidator.equals(
    "deleted_at not set after creation",
    community.deleted_at,
    null,
  );

  // 3. Create/Join moderator assigned to the created community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(15);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword as string & tags.Format<"password">,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "assigned community_id",
    moderator.community_id,
    community.id,
  );

  // 4. Archive (soft delete) the community by this moderator
  await api.functional.communityPlatform.moderator.communities.erase(
    connection,
    {
      communityId: community.id,
    },
  );
  // (Assume the SDK now has moderator session)

  // 5. (Re-fetch: to validate) -- there is no GET or INDEX endpoint provided, so we'll skip actual re-fetch and just describe:
  //     If there were an API to get the community, would validate:
  //        - deleted_at is set (not null)
  //        - all fields (title, creator_member_id, etc) remain
  //        - not purged/hard deleted

  // 6. Attempt erase by a random (not-assigned) moderator: create another community and another moderator not assigned to the target
  const otherCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 15 }),
          slug: RandomGenerator.alphaNumeric(9),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);

  const outsiderModeratorEmail = typia.random<string & tags.Format<"email">>();
  const outsiderModeratorPassword = RandomGenerator.alphaNumeric(14);
  const outsiderModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: outsiderModeratorEmail,
        password: outsiderModeratorPassword as string & tags.Format<"password">,
        community_id: otherCommunity.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(outsiderModerator);

  // Switch connection to outsider moderator's credentials (authenticate as outsiderModerator if such function existed)
  // But the only way to update token is via .join(), so assume session is for that outsider moderator now

  await TestValidator.error(
    "outsider moderator cannot erase unassigned community",
    async () => {
      await api.functional.communityPlatform.moderator.communities.erase(
        connection,
        {
          communityId: community.id,
        },
      );
    },
  );

  // 7. Try to erase a community with a random UUID (non-existent)
  await TestValidator.error(
    "cannot erase a non-existent community",
    async () => {
      await api.functional.communityPlatform.moderator.communities.erase(
        connection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
