import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostStatusLog";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Validate moderator access to post status log details after proper
 * authentication and resource creation.
 *
 * 1. Register and login as a user (for owning post and community).
 * 2. Create a community as user.
 * 3. Create a post in that community (user context).
 * 4. Register and login as moderator (for access control context).
 * 5. Fetch the post's initial status log using moderator privileges.
 * 6. Assert that audit details include:
 *
 *    - User (actor),
 *    - Session,
 *    - Post reference,
 *    - Status transitions,
 *    - Event timestamp.
 */
export async function test_api_status_log_detail_moderator_access_by_new_mod(
  connection: api.IConnection,
) {
  // 1. Register as a new user (who will be post owner)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);

  // 2. Login as newly created user
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
      href: "https://community-platform.test/login", // realistic values for required fields
      referrer: "https://community-platform.test/",
    } satisfies ICommunityPlatformUser.ILogin,
  });

  // 3. Create a new community as the user
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        display_title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        visibility: "public",
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Create a post in the community
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 4,
          sentenceMax: 8,
        }),
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Register as a new moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(14);
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      status: "active",
      href: "https://community-platform.test/mod/signup",
      referrer: "https://community-platform.test/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderatorJoin);

  // 6. Login as that moderator (simulate context switch)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword as string & tags.Format<"password">,
      href: "https://community-platform.test/mod/login",
      referrer: "https://community-platform.test/login",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 7. Since no direct status log list API, we assume the initial status log is created for the post creation, and statusLogId == post.id (frequently status log shares the same id as post for the first entry). Otherwise, this would require a list API. (If returns not found, this means setup is incomplete).
  // Try fetch status log for the created post. Use post.id as statusLogId for initial event.
  const statusLog =
    await api.functional.communityPlatform.moderator.posts.statusLogs.at(
      connection,
      {
        postId: post.id,
        statusLogId: post.id,
      },
    );
  typia.assert(statusLog);
  // Audit: Should have required nested audit and reference info
  TestValidator.equals(
    "post id in status log matches original post",
    statusLog.post.id,
    post.id,
  );
  TestValidator.equals(
    "actor user id in status log matches post creator",
    statusLog.user.id,
    post.user.id,
  );
  TestValidator.equals(
    "status log new_status matches post.status",
    statusLog.new_status,
    post.status,
  );
  // Timestamp and session info
  TestValidator.predicate(
    "status log created_at should be date-time",
    typeof statusLog.created_at === "string" && statusLog.created_at.length > 0,
  );
  TestValidator.predicate(
    "status log references user session with uuid",
    typeof statusLog.userSession.id === "string" &&
      statusLog.userSession.id.length > 0,
  );
}
