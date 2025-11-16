import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Ensure post update respects locking and status-based edit restrictions.
 *
 * Business goal: Verify that the memberUser post update endpoint (PUT
 * /communityPlatform/memberUser/posts/{postId}) allows an author to transition
 * a post into a locked or restricted status, but subsequently blocks further
 * edits to user-facing content fields (title, body, link_url) while the post
 * remains locked/restricted.
 *
 * High-level steps:
 *
 * 1. Join as a member user to obtain an authenticated memberUser session.
 * 2. Create a community owned by this member user.
 * 3. Create a post within that community as this member user.
 * 4. Lock or restrict the post via update (set is_locked=true and change status to
 *    a restricted value) and confirm the update succeeds.
 * 5. Attempt to modify user-facing content fields via a second update while the
 *    post is locked/restricted, and assert that this attempt fails.
 * 6. Retrieve the post and confirm that user-facing content fields have not
 *    changed, and that lock/status remain enforced.
 */
export async function test_api_post_update_respects_lock_and_status_rules(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user via join
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community
  const communityBody = {
    slug: RandomGenerator.alphabets(10),
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
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create an initial post as a text/link type
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialBody = RandomGenerator.paragraph({ sentences: 4 });
  const initialUrl = typia.random<string & tags.Format<"uri">>();

  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: initialTitle,
    body: initialBody,
    url: initialUrl,
    postType: "link",
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(createdPost);

  // Snapshot initial state
  const preLockTitle = createdPost.title;
  const preLockBody = createdPost.body ?? null;
  const preLockLinkUrl = createdPost.link_url ?? null;
  const preLockUpdatedAt = createdPost.updated_at;

  // 4. Lock the post and set a restricted status via update
  const restrictedStatus = "locked";
  const lockUpdateBody = {
    status: restrictedStatus,
    is_locked: true,
  } satisfies ICommunityPlatformPost.IUpdate;

  const lockedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.update(connection, {
      postId: createdPost.id,
      body: lockUpdateBody,
    });
  typia.assert(lockedPost);

  // Validate lock and status applied, and updated_at advanced
  TestValidator.equals(
    "post should be locked after first update",
    lockedPost.is_locked,
    true,
  );
  TestValidator.equals(
    "post status should reflect restricted/locked value",
    lockedPost.status,
    restrictedStatus,
  );
  TestValidator.predicate(
    "updated_at should advance after lock update",
    new Date(lockedPost.updated_at).getTime() >=
      new Date(preLockUpdatedAt).getTime(),
  );

  // 5. Attempt to modify user-facing content fields while locked
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newBody = RandomGenerator.paragraph({ sentences: 3 });
  const newUrl = typia.random<string & tags.Format<"uri">>();

  const forbiddenContentUpdate = {
    title: newTitle,
    body: newBody,
    link_url: newUrl,
  } satisfies ICommunityPlatformPost.IUpdate;

  await TestValidator.error(
    "locked post should reject content edits",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.update(
        connection,
        {
          postId: createdPost.id,
          body: forbiddenContentUpdate,
        },
      );
    },
  );

  // 6. Fetch post and verify content unchanged and lock/status persist
  const reloaded: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert(reloaded);

  TestValidator.equals(
    "title must remain unchanged after failed locked update",
    reloaded.title,
    preLockTitle,
  );

  TestValidator.equals(
    "body must remain unchanged after failed locked update",
    reloaded.body ?? null,
    preLockBody,
  );

  TestValidator.equals(
    "link_url must remain unchanged after failed locked update",
    reloaded.link_url ?? null,
    preLockLinkUrl,
  );

  TestValidator.equals(
    "post must remain locked after failed content edit",
    reloaded.is_locked,
    true,
  );
  TestValidator.equals(
    "post status must remain restricted/locked after failed content edit",
    reloaded.status,
    restrictedStatus,
  );
}
