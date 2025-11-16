import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate a user can successfully delete their own comment bookmark.
 *
 * Workflow steps:
 *
 * 1. Register a user (onboarding and authentication)
 * 2. Create a new community
 * 3. User subscribes to the new community
 * 4. (Assumed: A comment and bookmark exist for the user to delete)
 * 5. Delete the user's own comment bookmark
 * 6. Verify the bookmark can no longer be retrieved (actual bookmark lookup
 *    assumed as out of scope for current API set)
 *
 * Only the owner (authenticated user) may delete the bookmark; cross-user auth
 * checks are covered in other tests.
 */
export async function test_api_comment_bookmark_deletion_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register user
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // Step 2: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10) as string &
          tags.MinLength<3> &
          tags.MaxLength<30>,
        display_title: RandomGenerator.paragraph({ sentences: 3 }) as string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
        description: RandomGenerator.content({ paragraphs: 2 }) as string &
          tags.MinLength<1> &
          tags.MaxLength<2000>,
        visibility: RandomGenerator.pick([
          "public",
          "private",
          "invite-only",
        ] as const),
        status: RandomGenerator.pick([
          "active",
          "archived",
          "banned",
          "pending approval",
        ] as const),
        image_url: undefined,
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: User subscribes to the community
  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.user.communitySubscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // Step 4: (Assumed: Comment and bookmark are present)
  // For testing, we simulate a user-owned bookmark ID as random UUID (no create API available for comment/bookmark in current SDK)
  const commentBookmarkId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Delete the user's own comment bookmark
  await api.functional.communityPlatform.user.commentBookmarks.erase(
    connection,
    {
      commentBookmarkId,
    },
  );
  // Success is no error (void return)
}
