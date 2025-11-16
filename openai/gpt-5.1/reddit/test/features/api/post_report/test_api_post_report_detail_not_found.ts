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
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Verify admin-only post report detail returns not-found for non-existent IDs.
 *
 * Business goal:
 *
 * - Ensure that the admin detail endpoint for post reports does not return a
 *   record when given a postReportId that does not exist, and instead signals a
 *   not-found style error.
 * - Also confirm that when a valid report ID is provided, the endpoint
 *   successfully returns a fully-typed ICommunityPlatformPostReport.
 *
 * High level flow:
 *
 * 1. Create a memberUser account and implicitly authenticate via join.
 * 2. As memberUser, create a community.
 * 3. As the same memberUser, create a post in that community.
 * 4. As memberUser, create a post report targeting that post.
 * 5. Create an adminUser account and implicitly authenticate via join.
 * 6. As adminUser, construct a UUID that is guaranteed not to equal the created
 *    report's ID and call the admin detail endpoint.
 * 7. Assert that the call with the non-existent ID results in an error using
 *    TestValidator.error (without checking status codes), proving not-found
 *    semantics are enforced for missing IDs.
 * 8. As adminUser, call the same endpoint with the real report ID and assert that
 *    the response is a valid ICommunityPlatformPostReport whose ID matches the
 *    created report.
 */
export async function test_api_post_report_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser via join.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As memberUser, create a community.
  const communityCreateBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3. As memberUser, create a post in that community.
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. As memberUser, create a post report for that post.
  const reportCreateBody = {
    post_id: post.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    severity: "low",
  } satisfies ICommunityPlatformPostReport.ICreate;

  const createdReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 5. Create and authenticate an adminUser via join.
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. As adminUser, build a clearly non-existent report ID.
  // We generate a fresh UUID and ensure it doesn't equal the real report ID.
  let nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistentId === createdReport.id) {
    nonExistentId = typia.random<string & tags.Format<"uuid">>();
  }

  // 7. Call the admin detail endpoint with the non-existent ID and expect an error.
  await TestValidator.error(
    "non-existent post report id should result in not-found style error",
    async () => {
      await api.functional.communityPlatform.adminUser.postReports.at(
        connection,
        {
          postReportId: nonExistentId,
        },
      );
    },
  );

  // 8. Call the same endpoint with the real report ID and validate the result.
  const foundReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.adminUser.postReports.at(
      connection,
      {
        postReportId: createdReport.id,
      },
    );
  typia.assert(foundReport);

  TestValidator.equals(
    "admin detail endpoint returns the expected report for a valid id",
    foundReport.id,
    createdReport.id,
  );
}
