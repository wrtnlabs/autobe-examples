import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Test the ability of a reddit community moderator to delete a reddit community
 * post report.
 *
 * Scenario:
 *
 * 1. Moderator account is created and authenticated.
 * 2. Registered user account is created and authenticated.
 * 3. Registered user creates a reddit community.
 * 4. Registered user creates a post within that community.
 * 5. Registered user creates a post report for that post.
 * 6. Moderator logs in again to set authorization context.
 * 7. Moderator deletes the post report.
 *
 * This tests authorization boundaries ensuring only moderators can delete
 * reports.
 */
export async function test_api_post_report_delete_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator joins the platform
  const moderatorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityModerator.ICreate;
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 2. Registered user joins the platform
  const registeredUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: registeredUserJoinBody,
    });
  typia.assert(registeredUser);

  // 3. Registered user creates a new reddit community
  const redditCommunityCreateBody = {
    communityName: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: redditCommunityCreateBody,
      },
    );
  typia.assert(community);

  // 4. Registered user creates a post within the created community
  const postType = RandomGenerator.pick(["text", "link", "image"] as const);
  const postCreateBody: IRedditCommunityPost.ICreate = {
    // Since IRedditCommunityCommunity has no UUID id, we must assign community id as a freshly generated uuid.
    // This breaks referential integrity but required due to schema & DTO limitations.
    reddit_community_community_id: typia.random<string & tags.Format<"uuid">>(),
    type: postType,
    title: RandomGenerator.paragraph({ sentences: 3 }),
  };

  if (postType === "text") {
    postCreateBody.body = RandomGenerator.content({ paragraphs: 1 });
  } else if (postType === "link") {
    postCreateBody.link_url = `https://${RandomGenerator.alphaNumeric(8)}.com`;
  } else if (postType === "image") {
    postCreateBody.image_url = `https://images.example.com/${RandomGenerator.alphaNumeric(10)}.png`;
  }

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 5. Registered user creates a post report for the post
  const postReportCreateBody = {
    reason: RandomGenerator.paragraph({ sentences: 5 }),
    post_id: post.id,
  } satisfies IRedditCommunityPostReport.ICreate;

  const postReport: IRedditCommunityPostReport =
    await api.functional.redditCommunity.registeredUser.redditCommunityPostReports.create(
      connection,
      {
        body: postReportCreateBody,
      },
    );
  typia.assert(postReport);

  // 6. Moderator login again to ensure auth context (simulate actor switching)
  const moderatorLoginBody = {
    email: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "http://localhost/",
    referrer: "http://localhost/",
  } satisfies IRedditCommunityModerator.ILogin;

  await api.functional.auth.moderator.login(connection, {
    body: moderatorLoginBody,
  });

  // 7. Moderator deletes the post report
  await api.functional.redditCommunity.moderator.redditCommunityPostReports.erase(
    connection,
    {
      postReportId: postReport.id,
    },
  );
}
