import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that adminUser post unlock honors moderation-related account
 * restrictions.
 *
 * End-to-end flow:
 *
 * 1. A memberUser joins and creates a community.
 * 2. The memberUser creates a post inside that community.
 * 3. Admin A joins, logs in, locks the post, and then successfully unlocks it.
 * 4. Admin B joins, logs in, applies a moderation-related account restriction
 *    (e.g. scope="moderation") to themselves via the generic
 *    accountRestrictions create endpoint.
 * 5. Admin B attempts to unlock the same post and the operation must fail; the
 *    post remains locked.
 * 6. Admin C joins, logs in, applies a non-moderation restriction (e.g.
 *    scope="login") and is still able to unlock a locked post.
 *
 * We assert:
 *
 * - Locking a post sets is_locked=true as observed by GET
 *   /communityPlatform/posts/{postId}.
 * - Unlocking by an unrestricted adminUser sets is_locked=false.
 * - Unlocking by an adminUser with a restrictive moderation scope fails and
 *   leaves is_locked=true.
 * - Unlocking by an adminUser with a non-moderation scope still succeeds.
 */
export async function test_api_admin_post_unlock_respects_moderation_restrictions(
  connection: api.IConnection,
) {
  // Helper to create and authorize a memberUser via join.
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberUser);

  // 1. MemberUser creates a community
  const communityCreate = {
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
        body: communityCreate,
      },
    );
  typia.assert(community);

  // 2. MemberUser creates a post in that community
  const postCreate = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);
  TestValidator.equals(
    "newly created post should be unlocked by default",
    post.is_locked,
    false,
  );

  // Helper to reload the post by id.
  const reloadPost = async (): Promise<ICommunityPlatformPost> => {
    const reloaded: ICommunityPlatformPost =
      await api.functional.communityPlatform.posts.at(connection, {
        postId: post.id,
      });
    typia.assert(reloaded);
    return reloaded;
  };

  // 3. Admin A: join, login, lock the post, and unlock successfully.
  const adminAJoin = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoin,
    });
  typia.assert(adminA);

  const adminALogin = {
    identifier: adminA.email,
    password: adminAJoin.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;
  const adminALoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminALogin,
    });
  typia.assert(adminALoggedIn);

  // Lock the post via adminUser lock endpoint
  const lockedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.lock.update(
      connection,
      {
        postId: post.id,
        body: {
          is_locked: true,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(lockedPost);
  TestValidator.equals(
    "post should be locked after adminA lock",
    lockedPost.is_locked,
    true,
  );

  const lockedReloaded = await reloadPost();
  TestValidator.equals(
    "reloaded post should reflect locked state",
    lockedReloaded.is_locked,
    true,
  );

  // Unlock with unrestricted admin A
  const unlockedByAdminA: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.unlock(connection, {
      postId: post.id,
    });
  typia.assert(unlockedByAdminA);
  TestValidator.equals(
    "post should be unlocked after adminA unlock",
    unlockedByAdminA.is_locked,
    false,
  );

  const reloadedAfterUnlockA = await reloadPost();
  TestValidator.equals(
    "reloaded post after adminA unlock should be unlocked",
    reloadedAfterUnlockA.is_locked,
    false,
  );

  // Re-lock the post to prepare for restricted scenarios
  const relockedForRestriction: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.lock.update(
      connection,
      {
        postId: post.id,
        body: {
          is_locked: true,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(relockedForRestriction);
  TestValidator.equals(
    "post should be relocked before testing restricted admin",
    relockedForRestriction.is_locked,
    true,
  );

  // Shared timestamps for restriction windows
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  // 4. Admin B: create, login, apply a moderation-related restriction, and fail to unlock.
  const adminBJoin = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminB: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoin,
    });
  typia.assert(adminB);

  const adminBLogin = {
    identifier: adminB.email,
    password: adminBJoin.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;
  const adminBLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminBLogin,
    });
  typia.assert(adminBLoggedIn);

  const moderationRestrictionCreate = {
    account_type: "adminUser",
    scope: "moderation",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: now.toISOString(),
    ends_at: oneHourLater.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const moderationRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: moderationRestrictionCreate,
      },
    );
  typia.assert(moderationRestriction);

  await TestValidator.error(
    "restricted admin (moderation scope) should not be able to unlock post",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.unlock(
        connection,
        {
          postId: post.id,
        },
      );
    },
  );

  const postAfterRestrictedAttempt = await reloadPost();
  TestValidator.equals(
    "post should remain locked after restricted admin unlock attempt",
    postAfterRestrictedAttempt.is_locked,
    true,
  );

  // 5. Admin C: non-moderation restriction scope (e.g. login) should not block unlock.
  const adminCJoin = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminC: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminCJoin,
    });
  typia.assert(adminC);

  const adminCLogin = {
    identifier: adminC.email,
    password: adminCJoin.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;
  const adminCLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminCLogin,
    });
  typia.assert(adminCLoggedIn);

  const nonModerationRestrictionCreate = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "security",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    starts_at: now.toISOString(),
    ends_at: oneHourLater.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const nonModerationRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: nonModerationRestrictionCreate,
      },
    );
  typia.assert(nonModerationRestriction);

  const unlockedByAdminC: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.unlock(connection, {
      postId: post.id,
    });
  typia.assert(unlockedByAdminC);
  TestValidator.equals(
    "post should be unlocked by adminC despite non-moderation restriction",
    unlockedByAdminC.is_locked,
    false,
  );

  const finalReload = await reloadPost();
  typia.assert(finalReload);
  TestValidator.equals(
    "final post state should be unlocked",
    finalReload.is_locked,
    false,
  );
}
