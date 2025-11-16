import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostStatusLog";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostStatusLog";

/**
 * Validate searching for post status logs as administrator.
 *
 * 1. Create an administrator account and authenticate.
 * 2. Create a user account and authenticate as user.
 * 3. User creates a community.
 * 4. User creates a post in the community.
 * 5. Re-authenticate as administrator.
 * 6. Search for status logs on the new post (should be zero or one - only initial
 *    publish event).
 * 7. Validate that results are empty or contain only the initial status event.
 * 8. Validate pagination structure.
 */
export async function test_api_status_log_search_by_administrator_on_existing_post(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);

  // 3. User creates a community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        display_title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        visibility: "public",
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. User creates a post in the community
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Re-authenticate as administrator (ensure context switching)
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin-portal.local/login",
      referrer: "https://admin-portal.local/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 6. Administrator searches for status logs for the post
  const result =
    await api.functional.communityPlatform.administrator.posts.statusLogs.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformPostStatusLog.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.predicate(
    "pagination object exists and has correct page",
    result.pagination.current === 1 && result.pagination.limit === 10,
  );
  TestValidator.predicate(
    "status log list is array",
    Array.isArray(result.data),
  );
  // In absence of moderation actions, initial status log may be present (published), or none.
  // If any logs, they must refer to the created post.
  if (result.data.length > 0) {
    TestValidator.predicate(
      "all status logs refer to the created post",
      result.data.every((log) => log.post.id === post.id),
    );
  }
}
