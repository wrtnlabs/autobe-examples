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
import type { ICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostEditHistory";

/**
 * Verify admin-only access control for post edit history listing.
 *
 * This E2E test exercises the administrative edit history endpoint `PATCH
 * /communityPlatform/adminUser/posts/{postId}/editHistories` across three
 * different authentication contexts:
 *
 * 1. Unauthenticated client
 *
 *    - Attempts to call the admin edit history endpoint without any Authorization
 *         header.
 *    - Must be rejected with an HTTP 401 Unauthorized error.
 * 2. Authenticated memberUser (non-admin)
 *
 *    - Registers and logs in as a regular community member.
 *    - Creates a community and a post as that member.
 *    - Attempts to call the admin edit history endpoint for the post they authored.
 *    - Must be rejected with an HTTP 403 Forbidden error, proving that author status
 *         alone does not grant access to admin-only tooling.
 * 3. Authenticated adminUser
 *
 *    - Registers an adminUser account and authenticates, so that the same connection
 *         now holds an admin token.
 *    - Calls the admin edit history endpoint for the same post.
 *    - Must succeed with a 200 response and a properly typed
 *         `IPageICommunityPlatformPostEditHistory.ISummary` payload whose
 *         pagination settings match the request and whose histories (if any)
 *         are scoped to the target post.
 *
 * Business rules validated:
 *
 * - The administrative edit history endpoint must not be callable by
 *   unauthenticated clients.
 * - Regular memberUser actors, even when they authored the post, cannot access
 *   admin-only edit history APIs.
 * - AdminUser actors can successfully retrieve paginated edit history summaries
 *   for a specific post.
 */
export async function test_api_post_edit_history_admin_access_controls(
  connection: api.IConnection,
) {
  // 1. Register a member user (memberUser.join) and authenticate
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `member_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as this member user
  const communityBody = {
    slug: `comm-${RandomGenerator.alphaNumeric(6)}`,
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
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a post in that community as member user
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // Shared minimal valid history search body
  const historyRequestBody = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformPostEditHistory.IRequest;

  // 4. Unauthenticated client attempts to list edit histories (should be 401)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.httpError(
    "unauthenticated client cannot access admin post edit histories",
    401,
    async () => {
      await api.functional.communityPlatform.adminUser.posts.editHistories.index(
        unauthConn,
        {
          postId: post.id,
          body: historyRequestBody,
        },
      );
    },
  );

  // 5. Authenticated memberUser (non-admin) attempts the same (should be 403)
  await TestValidator.httpError(
    "memberUser cannot access admin post edit histories",
    403,
    async () => {
      await api.functional.communityPlatform.adminUser.posts.editHistories.index(
        connection,
        {
          postId: post.id,
          body: historyRequestBody,
        },
      );
    },
  );

  // 6. Register an adminUser account and authenticate
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(6)}`,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 7. As adminUser, successfully list edit histories
  const nowIso = new Date().toISOString();

  const adminHistoryRequestBody = {
    page: 1,
    limit: 10,
    sort_direction: "desc" as const,
    edited_from: undefined,
    edited_to: nowIso,
    editor_memberuser_id: undefined,
  } satisfies ICommunityPlatformPostEditHistory.IRequest;

  const historyPage: IPageICommunityPlatformPostEditHistory.ISummary =
    await api.functional.communityPlatform.adminUser.posts.editHistories.index(
      connection,
      {
        postId: post.id,
        body: adminHistoryRequestBody,
      },
    );
  typia.assert(historyPage);

  // Validate pagination limit matches the requested limit
  TestValidator.equals(
    "pagination limit must match requested limit for admin edit history listing",
    historyPage.pagination.limit,
    adminHistoryRequestBody.limit,
  );

  // If there is any data, ensure all histories belong to the same post
  if (historyPage.data.length > 0) {
    await ArrayUtil.asyncForEach(historyPage.data, async (summary) => {
      TestValidator.equals(
        "every edit history summary must belong to the requested post",
        summary.post_id,
        post.id,
      );
    });
  }
}
