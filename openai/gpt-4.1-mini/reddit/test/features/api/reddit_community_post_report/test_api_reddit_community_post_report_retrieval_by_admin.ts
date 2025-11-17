import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Test detailed retrieval of a reddit community post report by an admin user.
 *
 * This end-to-end test performs the following steps in sequence:
 *
 * 1. Admin user signs up and is authenticated.
 * 2. Registered user signs up and is authenticated.
 * 3. Registered user creates a post with a random community UUID.
 * 4. Registered user files a post report on the created post.
 * 5. Admin user authenticates and fetches the detailed post report by ID.
 * 6. Assertions verify the post report's integrity and correctness.
 *
 * This test validates cross-role authentication flows, data consistency, and
 * retrieval correctness for admin operations.
 */
export async function test_api_reddit_community_post_report_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd!",
        href: "http://localhost/admin/join",
        referrer: "http://localhost",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Registered user joins and authenticates
  const userEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: userEmail,
        password: "P@ssw0rd!",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // 3. Registered user creates a post with random community UUID
  const postTitle = RandomGenerator.paragraph({ sentences: 5 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      {
        body: {
          reddit_community_community_id: communityId,
          type: "text",
          title: postTitle,
          body: postBody,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 4. Registered user reports the post
  const reportReason = "Inappropriate content for testing purposes.";
  const postReport: IRedditCommunityPostReport =
    await api.functional.redditCommunity.registeredUser.redditCommunityPostReports.create(
      connection,
      {
        body: {
          reason: reportReason,
          post_id: post.id,
        } satisfies IRedditCommunityPostReport.ICreate,
      },
    );
  typia.assert(postReport);

  // 5. Switch back to admin user authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminEmail,
      password: "P@ssw0rd!",
      href: "http://localhost/admin/login",
      referrer: "http://localhost",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 6. Admin fetches the post report
  const reportFetched: IRedditCommunityPostReport =
    await api.functional.redditCommunity.admin.redditCommunityPostReports.at(
      connection,
      { postReportId: postReport.id },
    );
  typia.assert(reportFetched);

  // 7. Assertions on post report
  TestValidator.equals(
    "post report id matches",
    reportFetched.id,
    postReport.id,
  );
  TestValidator.equals(
    "post report reason matches",
    reportFetched.reason,
    reportReason,
  );
  TestValidator.equals(
    "post report references post id",
    reportFetched.reddit_community_post_id,
    post.id,
  );
}
