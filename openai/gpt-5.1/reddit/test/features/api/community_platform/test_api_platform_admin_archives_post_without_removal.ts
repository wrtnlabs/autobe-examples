import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Platform admin archives a member post without removing its visibility.
 *
 * Business goal:
 *
 * - Verify that a platform administrator can set a post into an archived,
 *   read-only state while the post remains visible, and that moderation fields
 *   can be set to a neutral, non-violating state with no moderation reason.
 *
 * End-to-end steps:
 *
 * 1. Register a platform administrator (platformAdmin.join) to obtain an admin
 *    account and initial tokens.
 * 2. As that platform admin, create a community visibility level configuration
 *    that will be referenced by a new community.
 * 3. As platform admin, create a post type configuration (e.g., a simple text post
 *    type) that will be used by the member when creating the post.
 * 4. Register a member user (memberUser.join) who will own the community and the
 *    post.
 * 5. As the member user, create a community using the created visibility level.
 * 6. As the member user, create a post in that community using the created post
 *    type.
 * 7. Switch back to the platform admin actor (platformAdmin.login).
 * 8. As the platform admin, update the post state via PUT
 *    /communityPlatform/platformAdmin/posts/{postId}/state with an
 *    ICommunityPlatformPostState.IUpdate payload that:
 *
 *    - Sets archival_state to an archived variant (e.g., "archived_readonly"),
 *    - Keeps visibility_state at a visible variant (e.g., "visible"),
 *    - Sets lock_state to a read-only variant (e.g., "locked_all"),
 *    - Sets moderation_state to a neutral/non-violating value (e.g., "none"),
 *    - Sets moderation_reason to null.
 * 9. Assert that the response body (ICommunityPlatformPostState) reflects these
 *    values, proving that the post is archived but still visible and
 *    non-violating.
 *
 * This test does not validate HTTP status codes explicitly or perform an
 * additional GET readback of state because those details are abstracted by the
 * SDK surface. Instead, it focuses on the returned typed DTO fields as the
 * source of truth for business behavior.
 */
export async function test_api_platform_admin_archives_post_without_removal(
  connection: api.IConnection,
) {
  // --- 1. Register a platform administrator (join) ---
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminHref: string & tags.Format<"uri"> =
    "https://admin.example.com/register" as string & tags.Format<"uri">;
  const adminReferrer: string & tags.Format<"uri"> =
    "https://admin.example.com/" as string & tags.Format<"uri">;

  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: adminEmail,
      password: "Password!123",
      displayName: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert(adminJoin);

  // --- 2. Create a community visibility level configuration ---
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public Visible",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // --- 3. Create a post type configuration ---
  const postTypeCode = `text_${RandomGenerator.alphabets(6)}`;
  const postType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: postTypeCode,
          name: "Text Post",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert(postType);

  // --- 4. Register a member user (join) ---
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberHref: string & tags.Format<"uri"> =
    "https://client.example.com/join" as string & tags.Format<"uri">;
  const memberReferrer: string & tags.Format<"uri"> =
    "https://client.example.com/" as string & tags.Format<"uri">;

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberEmail,
      password: "MemberPass!123",
      ip: "127.0.0.1",
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberJoin);

  // --- 5. As member user, create a community using the visibility level ---
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communityDescription = RandomGenerator.paragraph({ sentences: 8 });

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: communityDescription,
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // --- 6. As member user, create a post in that community using the post type ---
  const postTitle = RandomGenerator.paragraph({ sentences: 4 });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type_id: postType.id,
        title: postTitle,
        body: postBody,
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // --- 7. Switch back to platformAdmin by logging in ---
  const adminLoginHref: string & tags.Format<"uri"> =
    "https://admin.example.com/login" as string & tags.Format<"uri">;
  const adminLoginReferrer: string & tags.Format<"uri"> =
    "https://admin.example.com/" as string & tags.Format<"uri">;

  const adminLogin = await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminJoin.email,
      password: "Password!123",
      ip: "127.0.0.1",
      href: adminLoginHref,
      referrer: adminLoginReferrer,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });
  typia.assert(adminLogin);

  // --- 8. As platform admin, update the post state to archived-but-visible ---
  const visibilityState = "visible";
  const archivalState = "archived_readonly";
  const lockState = "locked_all";
  const moderationState = "none";

  const updatedState =
    await api.functional.communityPlatform.platformAdmin.posts.state.update(
      connection,
      {
        postId: post.id,
        body: {
          visibility_state: visibilityState,
          lock_state: lockState,
          archival_state: archivalState,
          moderation_state: moderationState,
          moderation_reason: null,
        } satisfies ICommunityPlatformPostState.IUpdate,
      },
    );
  typia.assert(updatedState);

  // --- 9. Validate that the post is archived but still visible and non-violating ---
  TestValidator.equals(
    "post visibility_state should remain visible",
    updatedState.visibility_state,
    visibilityState,
  );
  TestValidator.equals(
    "post archival_state should reflect archived read-only",
    updatedState.archival_state,
    archivalState,
  );
  TestValidator.equals(
    "post lock_state should reflect locked_all (read-only)",
    updatedState.lock_state,
    lockState,
  );
  TestValidator.equals(
    "post moderation_state should be neutral none",
    updatedState.moderation_state,
    moderationState,
  );
  TestValidator.equals(
    "post moderation_reason should be null when neutral",
    updatedState.moderation_reason,
    null,
  );
}
