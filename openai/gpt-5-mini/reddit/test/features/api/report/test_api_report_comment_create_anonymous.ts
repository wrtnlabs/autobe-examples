import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_report_comment_create_anonymous(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * 1. Create an authenticated community member (alice) via join
   * 2. Create a unique community
   * 3. Create a post in that community
   * 4. Create a comment on the post
   * 5. As an anonymous client (no Authorization header) create a report for the
   *    comment
   * 6. Validate the report has reporter_id = null, status = 'open', and created_at
   *    present
   * 7. Negative test: reporting a non-existent comment should fail (error thrown)
   */

  // 1) Register community member (alice)
  const aliceEmail: string = typia.random<string & tags.Format<"email">>();
  const aliceUsername = `alice_${RandomGenerator.alphaNumeric(6)}`;
  const aliceAuth = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: aliceEmail,
      username: aliceUsername,
      password: "Passw0rd!",
      display_name: RandomGenerator.name(),
      session_context: {
        href: "http://example.com/",
        referrer: "http://example.com/",
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(aliceAuth);

  // After join the SDK populates connection.headers.Authorization with the access token

  // 2) Create a unique community
  const uniqueSlug = `test-community-${Date.now()}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.paragraph({ sentences: 2 })}`,
          slug: uniqueSlug,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibility: "public",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Create a post in that community
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          post_type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);

  // 4) Create a comment on the post
  const comment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(comment);

  // Validate the comment exists and is visible (not removed)
  TestValidator.predicate(
    "created comment exists and is visible",
    comment.id !== undefined &&
      comment.id !== null &&
      comment.is_removed !== true,
  );

  // 5) As anonymous client, create a report targeting the comment
  const anonymousConn: api.IConnection = { ...connection, headers: {} };

  const report = await api.functional.communityBbs.reports.create(
    anonymousConn,
    {
      body: {
        target_type: "comment",
        target_id: comment.id,
        reason_code: "harassment",
        explanation:
          "Anonymous report: harassment content observed in comment.",
      } satisfies ICommunityBbsReport.ICreate,
    },
  );
  typia.assert(report);

  // Validation points
  TestValidator.equals(
    "report reporter is null for anonymous submission",
    report.reporter_id,
    null,
  );
  TestValidator.equals("report status is open", report.status, "open");
  TestValidator.predicate(
    "report created_at is present",
    report.created_at !== undefined &&
      report.created_at !== null &&
      report.created_at.length > 0,
  );

  // Ensure no internal-only fields are present in the response shape by relying on typia.assert
  // (typia.assert already validated the response type). We avoid checking raw headers or internal fields.

  // 6) Negative test: reporting non-existent comment should throw an error
  await TestValidator.error(
    "reporting non-existent comment should fail",
    async () => {
      await api.functional.communityBbs.reports.create(anonymousConn, {
        body: {
          target_type: "comment",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          reason_code: "harassment",
        } satisfies ICommunityBbsReport.ICreate,
      });
    },
  );
}
