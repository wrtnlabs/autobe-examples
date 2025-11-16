import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify that unlocking an already-unlocked post by an adminUser is safe and
 * behaves idempotently.
 *
 * Business flow:
 *
 * 1. A memberUser signs up and becomes authenticated.
 * 2. The memberUser creates a community.
 * 3. The memberUser creates a post in that community. The post is assumed to be
 *    unlocked by default (is_locked === false).
 * 4. An adminUser signs up (and logs in if desired) so that the connection holds
 *    an admin Authorization context.
 * 5. The adminUser calls the unlock endpoint for the post that is already
 *    unlocked.
 *
 * Expectations:
 *
 * - The unlock operation succeeds and returns a valid ICommunityPlatformPost.
 * - The post remains unlocked (is_locked stays false) after the unlock call.
 * - Core identity and ownership fields (id, community_id, author_memberuser_id)
 *   are unchanged.
 * - Business status field (status) is unchanged.
 * - The created_at timestamp is unchanged, proving the same row is updated and
 *   not recreated.
 * - Updated_at may change due to the moderation operation, so the test does not
 *   assert a strict equality on updated_at but only validates overall type
 *   correctness via typia.assert.
 */
export async function test_api_admin_post_unlock_idempotent_when_already_unlocked(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community as the memberUser.
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a post in that community as the memberUser.
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(createdPost);

  // Precondition: the newly created post should not be locked.
  TestValidator.predicate(
    "newly created post should be unlocked by default",
    createdPost.is_locked === false,
  );

  // 4. Register an adminUser (admin join).
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1n-" + RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 5. Explicitly login as the same adminUser to validate login and ensure
  // admin context is active (even though join already set the token).
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoggedIn);

  // 6. Call unlock on an already-unlocked post as adminUser.
  const unlockedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.unlock(connection, {
      postId: createdPost.id,
    });
  typia.assert<ICommunityPlatformPost>(unlockedPost);

  // 7. Validate idempotent / safe behavior.
  TestValidator.equals(
    "unlock should not change post id",
    unlockedPost.id,
    createdPost.id,
  );
  TestValidator.equals(
    "unlock should not change community_id",
    unlockedPost.community_id,
    createdPost.community_id,
  );
  TestValidator.equals(
    "unlock should not change author_memberuser_id",
    unlockedPost.author_memberuser_id,
    createdPost.author_memberuser_id,
  );
  TestValidator.equals(
    "unlock should preserve post status",
    unlockedPost.status,
    createdPost.status,
  );
  TestValidator.equals(
    "unlock should keep post unlocked (is_locked remains false)",
    unlockedPost.is_locked,
    false,
  );
  TestValidator.equals(
    "created_at must remain the same after unlock",
    unlockedPost.created_at,
    createdPost.created_at,
  );
}
