import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test updating community posting permissions and verifying immediate
 * enforcement.
 *
 * This test validates the complete workflow of community posting permission
 * management, ensuring that permission changes take immediate effect and are
 * properly reflected in the community configuration.
 *
 * Test workflow:
 *
 * 1. Register member who will be the community creator/moderator
 * 2. Create community with 'anyone_subscribed' posting permission
 * 3. Update community to 'moderators_only' posting permission
 * 4. Verify posting permission change is reflected
 * 5. Update community to 'approved_only' posting permission
 * 6. Verify final posting permission state
 */
export async function test_api_community_posting_permissions_update(
  connection: api.IConnection,
) {
  // Step 1: Register member who will be the community creator/moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community with 'anyone_subscribed' posting permission
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        posting_permission: "anyone_subscribed",
        privacy_type: "public",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals(
    "initial posting permission",
    community.posting_permission,
    "anyone_subscribed",
  );

  // Step 3: Update posting permission to 'moderators_only'
  const updatedToModeratorsOnly: IRedditLikeCommunity =
    await api.functional.redditLike.moderator.communities.update(connection, {
      communityId: community.id,
      body: {
        posting_permission: "moderators_only",
      } satisfies IRedditLikeCommunity.IUpdate,
    });
  typia.assert(updatedToModeratorsOnly);
  TestValidator.equals(
    "updated to moderators only",
    updatedToModeratorsOnly.posting_permission,
    "moderators_only",
  );

  // Step 4: Update posting permission to 'approved_only'
  const updatedToApprovedOnly: IRedditLikeCommunity =
    await api.functional.redditLike.moderator.communities.update(connection, {
      communityId: community.id,
      body: {
        posting_permission: "approved_only",
      } satisfies IRedditLikeCommunity.IUpdate,
    });
  typia.assert(updatedToApprovedOnly);
  TestValidator.equals(
    "updated to approved only",
    updatedToApprovedOnly.posting_permission,
    "approved_only",
  );

  // Step 5: Verify community ID remains unchanged throughout updates
  TestValidator.equals(
    "community ID unchanged",
    updatedToApprovedOnly.id,
    community.id,
  );
  TestValidator.equals(
    "final posting permission",
    updatedToApprovedOnly.posting_permission,
    "approved_only",
  );
}
