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

/**
 * Validate that creating a post report enforces existence of the referenced
 * post.
 *
 * Business intent:
 *
 * - A member user can submit reports against existing posts only.
 * - If a client attempts to create a report for a non-existent post_id, the
 *   backend must reject the request instead of silently accepting it.
 * - When a valid post_id is supplied, report creation should succeed for the same
 *   authenticated member user.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate a member user using the join endpoint. The SDK will
 *    attach the access token to the connection automatically.
 * 2. Create a community using
 *    api.functional.communityPlatform.memberUser.communities.create with a
 *    complete ICommunityPlatformCommunity.ICreate payload.
 * 3. Create a post in that community using
 *    api.functional.communityPlatform.memberUser.posts.create with a valid
 *    ICommunityPlatformPost.ICreate body, and capture its id.
 * 4. Generate a random UUID that does not equal the created post.id to simulate a
 *    non-existent post reference.
 * 5. Call api.functional.communityPlatform.memberUser.postReports.create with
 *    ICommunityPlatformPostReport.ICreate using the fake UUID in post_id and a
 *    realistic reason_category and severity. Use TestValidator.error with an
 *    async callback to assert that this operation fails, without checking
 *    concrete HTTP status codes.
 * 6. Immediately call
 *    api.functional.communityPlatform.memberUser.postReports.create again, this
 *    time with post_id equal to the real post.id. Assert that the call
 *    succeeds, validate the returned ICommunityPlatformPostReport via
 *    typia.assert, and perform basic logical checks (e.g., that severity and
 *    reason_category echo back the request payload) using
 *    TestValidator.equals.
 */
export async function test_api_post_report_creation_validates_existing_post(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. Generate a fake UUID that is different from the real post.id
  let fakePostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (fakePostId === post.id) {
    fakePostId = typia.random<string & tags.Format<"uuid">>();
  }

  // 5. Attempt to create a report for non-existent post_id and expect failure
  const invalidReportBody = {
    post_id: fakePostId,
    reason_category: "spam",
    reason_detail: "Automated test: reporting non-existent post",
    severity: "high",
  } satisfies ICommunityPlatformPostReport.ICreate;

  await TestValidator.error(
    "post report creation must fail for non-existent post_id",
    async () => {
      await api.functional.communityPlatform.memberUser.postReports.create(
        connection,
        { body: invalidReportBody },
      );
    },
  );

  // 6. Create a valid report for the existing post and expect success
  const validReportBody = {
    post_id: post.id,
    reason_category: "spam",
    reason_detail: "Automated test: reporting existing post",
    severity: "high",
  } satisfies ICommunityPlatformPostReport.ICreate;

  const report: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      { body: validReportBody },
    );
  typia.assert(report);

  TestValidator.equals(
    "report reason_category should echo request payload",
    report.reason_category,
    validReportBody.reason_category,
  );

  TestValidator.equals(
    "report severity should echo request payload",
    report.severity,
    validReportBody.severity,
  );
}
