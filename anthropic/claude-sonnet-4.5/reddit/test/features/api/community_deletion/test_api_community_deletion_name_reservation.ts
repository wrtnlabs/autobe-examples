import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that deleting a community reserves the community name to prevent
 * impersonation and confusion.
 *
 * This test validates the platform's name reservation mechanism for deleted
 * communities. When a community is deleted (soft delete), its name should
 * remain reserved in the system to prevent new communities from being created
 * with the same name. This protects against brand impersonation and user
 * confusion.
 *
 * Test workflow:
 *
 * 1. Register first moderator account
 * 2. Create a community with a unique name
 * 3. Soft delete the community
 * 4. Register second moderator account
 * 5. Attempt to create a new community with the same name
 * 6. Verify that the platform rejects the creation due to name reservation
 */
export async function test_api_community_deletion_name_reservation(
  connection: api.IConnection,
) {
  // Step 1: Register first moderator
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const firstModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstModeratorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://reddit-clone.com/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://reddit-clone.com/" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(firstModerator);

  // Step 2: Create a community with a unique name
  const uniqueCommunityName = `test_${RandomGenerator.alphaNumeric(10)}`;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: uniqueCommunityName,
          display_title: "Test Community for Name Reservation",
          description:
            "This community will be deleted to test name reservation functionality",
          rules: "Follow platform guidelines and be respectful",
          icon_url: "https://example.com/icon.png" satisfies
            | (string & tags.Format<"uri">)
            | null
            | undefined,
          banner_url: "https://example.com/banner.png" satisfies
            | (string & tags.Format<"uri">)
            | null
            | undefined,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community name matches",
    community.name,
    uniqueCommunityName,
  );

  // Step 3: Soft delete the community
  const deletedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.eraseByCommunityid(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(deletedCommunity);
  TestValidator.predicate(
    "community has deleted_at timestamp",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );

  // Step 4: Register second moderator
  const secondModeratorEmail = typia.random<string & tags.Format<"email">>();
  const secondModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: secondModeratorEmail,
        password: "AnotherPass456!",
        nickname: RandomGenerator.name(),
        ip: "192.168.1.2",
        href: "https://reddit-clone.com/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://reddit-clone.com/" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(secondModerator);

  // Step 5 & 6: Attempt to create community with same name and verify rejection
  await TestValidator.error(
    "cannot create community with reserved name",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: uniqueCommunityName,
            display_title: "Attempting to Reuse Deleted Community Name",
            description: "This should fail due to name reservation",
            rules: "Follow community guidelines",
            icon_url: null,
            banner_url: null,
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );
}
