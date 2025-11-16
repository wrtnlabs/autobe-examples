import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify that unauthenticated users cannot update an existing community post,
 * and that a failed unauthorized update does not mutate the underlying
 * community_platform_posts record.
 *
 * Business context:
 *
 * - Only authenticated member users (or higher‑privileged actors) are allowed to
 *   update posts via PUT /communityPlatform/memberUser/posts/{postId}.
 * - The same post should remain unchanged if an update attempt is made without a
 *   valid memberUser session.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate a member user using the join endpoint.
 * 2. Create a community with that authenticated member as owner.
 * 3. Create a post in that community and capture its id and mutable fields (title
 *    and body) as the original values.
 * 4. Prepare a meaningful update payload (ICommunityPlatformPost.IUpdate) that
 *    changes at least the title and body, and possibly other mutable fields
 *    like status or is_locked.
 * 5. Create an unauthenticated connection by cloning the existing connection but
 *    providing an empty headers object, without otherwise touching
 *    connection.headers on the original authenticated connection.
 * 6. Using the unauthenticated connection, attempt to update the post via
 *    api.functional.communityPlatform.memberUser.posts.update.
 *
 *    - This call must fail with an authentication error. Use TestValidator.error
 *         with an async closure to assert that an error is thrown, but do not
 *         assert any concrete HTTP status code.
 * 7. Using the original, authenticated connection, retrieve the post via
 *    api.functional.communityPlatform.posts.at.
 * 8. Assert that the retrieved post still has the original title and body captured
 *    in step 3, confirming no mutation occurred as a result of the unauthorized
 *    update attempt.
 */
export async function test_api_post_update_rejects_unauthenticated_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community for this member user.
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a post in that community and capture original content.
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const originalPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(originalPost);

  const originalTitle = originalPost.title;
  const originalBody = originalPost.body ?? null;

  // 4. Build an update payload that would change title/body.
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    status: originalPost.status,
    is_locked: originalPost.is_locked,
  } satisfies ICommunityPlatformPost.IUpdate;

  // 5. Create an unauthenticated connection with empty headers once.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Attempt to update using unauthenticated connection and expect error.
  await TestValidator.error(
    "unauthenticated post update must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.update(
        unauthenticatedConnection,
        {
          postId: originalPost.id,
          body: updateBody,
        },
      );
    },
  );

  // 7. Reload the post using the original authenticated connection.
  const reloaded: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: originalPost.id,
    });
  typia.assert(reloaded);

  // 8. Verify that title and body are unchanged from original values.
  TestValidator.equals(
    "post title must remain unchanged after unauthenticated update attempt",
    reloaded.title,
    originalTitle,
  );

  const reloadedBody = reloaded.body ?? null;
  TestValidator.equals(
    "post body must remain unchanged after unauthenticated update attempt",
    reloadedBody,
    originalBody,
  );
}
