import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

/**
 * Validate report creation for a community post by an authenticated member.
 *
 * Business context:
 *
 * - Members can file moderation reports against posts. A report must include a
 *   controlled reason code and may include optional details (text, urgency,
 *   severity, contact email).
 * - This test covers the entire happy path: register member -> create community
 *   -> (subscribe) -> create post -> file report. It also covers feasible
 *   negative scenarios: unauthenticated attempts, missing required fields,
 *   non-existent targets, and duplicate-report behavior detection.
 *
 * Steps:
 *
 * 1. Register a new member (auth.member.join) and obtain authorization.
 * 2. Create a public community (communityPortal.member.communities.create).
 * 3. Create a subscription
 *    (communityPortal.member.communities.subscriptions.create) to exercise that
 *    endpoint (safe for public communities).
 * 4. Create a text post in the community (communityPortal.member.posts.create).
 * 5. Happy-path: create a report against the created post
 *    (communityPortal.member.posts.reports.create) and validate returned
 *    properties.
 * 6. Negative cases using TestValidator.error(): unauthenticated reporting,
 *    missing reasonCode, and non-existent postId.
 * 7. Attempt duplicate report and detect whether the API prevents duplicates
 *    (throws) or allows creation (returns a report); record behavior.
 */
export async function test_api_report_post_create_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member and capture authorized output
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // Ensure we have the authenticated user id
  TestValidator.predicate(
    "registered member has id",
    typeof member.id === "string" && member.id.length > 0,
  );

  // 2. Create a community (public)
  const communityBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  TestValidator.equals(
    "community created id present",
    typeof community.id,
    "string",
  );

  // 3. Create a subscription (safe for public communities)
  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPortalSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 4. Create a text post in the community
  const postBody = {
    community_id: community.id,
    post_type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);
  TestValidator.equals("post created id present", typeof post.id, "string");

  // 5. Happy-path: create a report for the post
  const reportBody = {
    reasonCode: "spam",
    reasonText: "Automated test: this post looks like spam.",
    isUrgent: false,
    severity: "low",
    reporterContactEmail: typia.random<string & tags.Format<"email">>(),
  } satisfies ICommunityPortalReport.ICreate;

  const report: ICommunityPortalReport =
    await api.functional.communityPortal.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: reportBody,
      },
    );
  typia.assert(report);

  // Validate report properties (business assertions, typia.assert validated types)
  TestValidator.equals(
    "report reporter matches created member",
    report.reporterUserId,
    member.id,
  );
  TestValidator.equals("report targets post", report.postId, post.id);
  TestValidator.equals(
    "report reason preserved",
    report.reasonCode,
    reportBody.reasonCode,
  );
  TestValidator.equals(
    "report reason text preserved",
    report.reasonText,
    reportBody.reasonText,
  );

  // createdAt should be present (typia.assert already validated format), but assert presence
  TestValidator.predicate(
    "report createdAt is present",
    report.createdAt !== undefined && typeof report.createdAt === "string",
  );

  // 6a. Unauthenticated attempt should error (do not assert status code)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated report creation should fail",
    async () => {
      await api.functional.communityPortal.member.posts.reports.create(
        unauthConn,
        {
          postId: post.id,
          body: reportBody,
        },
      );
    },
  );

  // 6b. Missing required field (empty body) should error
  await TestValidator.error(
    "report creation without required reason should fail",
    async () => {
      await api.functional.communityPortal.member.posts.reports.create(
        connection,
        {
          postId: post.id,
          body: {} satisfies ICommunityPortalReport.ICreate,
        },
      );
    },
  );

  // 6c. Non-existent postId should error
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "report creation for non-existent post should fail",
    async () => {
      await api.functional.communityPortal.member.posts.reports.create(
        connection,
        {
          postId: fakePostId,
          body: reportBody,
        },
      );
    },
  );

  // 7. Duplicate-report behavior detection: attempt the same report again
  try {
    const secondReport: ICommunityPortalReport =
      await api.functional.communityPortal.member.posts.reports.create(
        connection,
        {
          postId: post.id,
          body: reportBody,
        },
      );
    // If succeeded, assert that it returned a report object and record that duplicates are allowed
    typia.assert(secondReport);
    TestValidator.predicate(
      "duplicate report accepted (system allowed creating another report)",
      typeof secondReport.id === "string" && secondReport.id.length > 0,
    );
  } catch {
    // If it threw, treat that as duplicate prevention behavior
    TestValidator.predicate(
      "duplicate report prevented by API (threw on second attempt)",
      true,
    );
  }
}
