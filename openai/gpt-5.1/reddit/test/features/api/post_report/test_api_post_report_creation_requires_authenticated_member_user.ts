import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

export async function test_api_post_report_creation_requires_authenticated_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) and get authenticated session
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community as the authenticated member
  const communityBody = {
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
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a post in that community as the same member
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Prepare a valid post report create body referencing created post
  const reportBody = {
    post_id: post.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    severity: "medium",
  } satisfies ICommunityPlatformPostReport.ICreate;

  // 5. Create an unauthenticated connection (no Authorization header)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Attempt to create a post report without authentication and expect failure
  await TestValidator.error(
    "creating post report without authentication must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.postReports.create(
        unauthConnection,
        {
          body: reportBody,
        },
      );
    },
  );

  // 7. Finally, create the post report with a valid authenticated connection
  const report: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);

  // Basic logical validation: reported post id in summary (if available) matches
  if (report.post !== undefined) {
    TestValidator.equals(
      "reported post id in report.post summary should match source post id",
      report.post.id,
      post.id,
    );
  }

  // Ensure that the report has the same reason_category and severity we sent
  TestValidator.equals(
    "report reason_category should match input",
    report.reason_category,
    reportBody.reason_category,
  );
  TestValidator.equals(
    "report severity should match input",
    report.severity,
    reportBody.severity,
  );
}
