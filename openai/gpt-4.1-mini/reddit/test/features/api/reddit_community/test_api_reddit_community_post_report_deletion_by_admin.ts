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

export async function test_api_reddit_community_post_report_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://localhost/admin/join",
    referrer: "https://localhost/admin/join/referrer",
  } satisfies IRedditCommunityAdmin.IJoin;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Admin login
  const adminLoginBody = {
    username: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "https://localhost/admin/login",
    referrer: "https://localhost/admin/login/referrer",
  } satisfies IRedditCommunityAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 3. Registered user join
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // 4. Registered user login
  const userLoginBody = {
    email: userJoinBody.email,
    password: userJoinBody.password,
    href: "https://localhost/user/login",
    referrer: "https://localhost/user/login/referrer",
  } satisfies IRedditCommunityRegisteredUser.ILogin;
  await api.functional.auth.registeredUser.login(connection, {
    body: userLoginBody,
  });

  // 5. Registered user creates community
  const communityCreateBody = {
    communityName: RandomGenerator.alphabets(10).toLowerCase(),
    displayName: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Registered user creates post
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postCreateBody = {
    reddit_community_community_id: communityId,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 7. Registered user creates post report
  const postReportCreateBody = {
    reason: RandomGenerator.paragraph({ sentences: 1 }),
    post_id: post.id,
  } satisfies IRedditCommunityPostReport.ICreate;
  const postReport: IRedditCommunityPostReport =
    await api.functional.redditCommunity.registeredUser.redditCommunityPostReports.create(
      connection,
      { body: postReportCreateBody },
    );
  typia.assert(postReport);

  // 8. Switch to admin authentication again before deleting the post report
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 9. Admin deletes the post report
  await api.functional.redditCommunity.admin.redditCommunityPostReports.erase(
    connection,
    { postReportId: postReport.id },
  );
}
