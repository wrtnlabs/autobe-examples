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
 * Validate that an adminUser can lock an existing community post and that the
 * locked state is correctly persisted without changing the post's identity or
 * core content fields.
 *
 * Business context:
 *
 * - A regular memberUser creates communities and posts.
 * - An adminUser has elevated privileges and can lock posts, which should prevent
 *   further interactions while keeping the post visible.
 *
 * Steps:
 *
 * 1. Register a memberUser (join) to act as the post author.
 * 2. Register an adminUser (join) to act as the moderator/administrator.
 * 3. Login as the memberUser.
 * 4. As memberUser, create a community.
 * 5. As memberUser, create a post in that community.
 * 6. Login as the adminUser.
 * 7. As adminUser, lock the post via the lock.update endpoint, setting is_locked
 *    to true using ICommunityPlatformPost.IUpdate.
 * 8. Assert that:
 *
 *    - The post id is unchanged.
 *    - The community_id is unchanged.
 *    - The author_memberuser_id is unchanged.
 *    - Title, body, status remain unchanged.
 *    - Is_locked is now true.
 *    - Updated_at has changed (indicating an update took place).
 * 9. Skip comment/vote interaction tests because relevant endpoints are not
 *    available in this context.
 */
export async function test_api_admin_lock_post_prevents_further_interactions(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register an adminUser (join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Login as the memberUser to ensure member token is active
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/login/member",
    referrer: "https://example.com/join",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  TestValidator.equals(
    "member login returns same member id",
    memberLoginAuthorized.id,
    memberAuthorized.id,
  );

  // 4. As memberUser, create a community
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
  typia.assert(community);

  // 5. As memberUser, create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: "https://example.com/post/" + RandomGenerator.alphaNumeric(8),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(createdPost);

  TestValidator.equals(
    "post community_id matches created community",
    createdPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author matches logged-in member",
    createdPost.author_memberuser_id,
    memberAuthorized.id,
  );

  const originalPost: ICommunityPlatformPost = { ...createdPost };

  // 6. Login as the adminUser to ensure admin token is active
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/login/admin",
    referrer: "https://example.com/join-admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  TestValidator.equals(
    "admin login returns same admin id",
    adminLoginAuthorized.id,
    adminAuthorized.id,
  );

  // 7. As adminUser, lock the post
  const lockUpdateBody = {
    is_locked: true,
  } satisfies ICommunityPlatformPost.IUpdate;

  const lockedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.lock.update(
      connection,
      {
        postId: createdPost.id,
        body: lockUpdateBody,
      },
    );
  typia.assert(lockedPost);

  // 8. Assertions on identity invariants and lock state
  TestValidator.equals(
    "locked post id unchanged",
    lockedPost.id,
    originalPost.id,
  );
  TestValidator.equals(
    "locked post community_id unchanged",
    lockedPost.community_id,
    originalPost.community_id,
  );
  TestValidator.equals(
    "locked post author_memberuser_id unchanged",
    lockedPost.author_memberuser_id,
    originalPost.author_memberuser_id,
  );
  TestValidator.equals(
    "locked post title unchanged",
    lockedPost.title,
    originalPost.title,
  );
  TestValidator.equals(
    "locked post body unchanged",
    lockedPost.body,
    originalPost.body,
  );
  TestValidator.equals(
    "locked post status unchanged",
    lockedPost.status,
    originalPost.status,
  );

  TestValidator.equals(
    "locked post is_locked is true",
    lockedPost.is_locked,
    true,
  );

  TestValidator.notEquals(
    "locked post updated_at should be different from original",
    lockedPost.updated_at,
    originalPost.updated_at,
  );

  // 9. Interaction rejection checks (comments/votes) are intentionally
  // omitted because corresponding endpoints are not available in the
  // provided SDK. This test focuses on lock flag correctness and identity
  // invariants only.
}
