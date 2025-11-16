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
 * Validate that an admin user can both lock and unlock a post using the same
 * lock endpoint, and that core identity fields remain stable.
 *
 * Business workflow:
 *
 * 1. Register an adminUser and a memberUser.
 * 2. Authenticate as memberUser to create a community.
 * 3. Still as memberUser, create a post within that community.
 * 4. Switch to adminUser context.
 * 5. Lock the post via the admin lock endpoint (is_locked: true) and verify the
 *    post is locked while id, community_id, and author_memberuser_id are
 *    unchanged.
 * 6. Unlock the same post via the lock endpoint (is_locked: false) and verify the
 *    post is unlocked with the same core fields.
 */
export async function test_api_admin_unlock_post_via_lock_endpoint(
  connection: api.IConnection,
) {
  // 1. Register adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginIdentifier: string = adminAuthorized.email;

  // 2. Register memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.test.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://client.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginIdentifier: string = memberAuthorized.email;

  // 3. Authenticate explicitly as memberUser for clarity (login)
  const memberLoginBody = {
    identifier: memberLoginIdentifier,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/join-complete" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 4. As memberUser, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
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
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(createdPost);

  // Sanity checks on created post
  TestValidator.equals(
    "created post community_id matches community.id",
    createdPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "created post initially unlocked or locked state is boolean",
    typeof createdPost.is_locked,
    "boolean",
  );

  const originalPostId: string = createdPost.id;
  const originalCommunityId: string = createdPost.community_id;
  const originalAuthorId: string = createdPost.author_memberuser_id;

  // 6. Switch to adminUser via login to ensure fresh admin context
  const adminLoginBody = {
    identifier: adminLoginIdentifier,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 7. Lock the post (is_locked: true)
  const lockUpdateBody = {
    is_locked: true,
  } satisfies ICommunityPlatformPost.IUpdate;

  const lockedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.lock.update(
      connection,
      {
        postId: originalPostId,
        body: lockUpdateBody,
      },
    );
  typia.assert(lockedPost);

  TestValidator.equals(
    "locking keeps same post id",
    lockedPost.id,
    originalPostId,
  );
  TestValidator.equals(
    "locking keeps same community_id",
    lockedPost.community_id,
    originalCommunityId,
  );
  TestValidator.equals(
    "locking keeps same author_memberuser_id",
    lockedPost.author_memberuser_id,
    originalAuthorId,
  );
  TestValidator.equals(
    "post is locked after lock operation",
    lockedPost.is_locked,
    true,
  );

  // 8. Unlock the post (is_locked: false)
  const unlockUpdateBody = {
    is_locked: false,
  } satisfies ICommunityPlatformPost.IUpdate;

  const unlockedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.lock.update(
      connection,
      {
        postId: originalPostId,
        body: unlockUpdateBody,
      },
    );
  typia.assert(unlockedPost);

  TestValidator.equals(
    "unlocking keeps same post id",
    unlockedPost.id,
    originalPostId,
  );
  TestValidator.equals(
    "unlocking keeps same community_id",
    unlockedPost.community_id,
    originalCommunityId,
  );
  TestValidator.equals(
    "unlocking keeps same author_memberuser_id",
    unlockedPost.author_memberuser_id,
    originalAuthorId,
  );
  TestValidator.equals(
    "post is unlocked after unlock operation",
    unlockedPost.is_locked,
    false,
  );
}
