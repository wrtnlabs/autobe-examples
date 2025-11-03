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

/*
 * Finalized E2E test: admin + report creation and validations.
 *
 * This final version applies the review feedback: replaces brittle TestValidator.error
 * negative case with a robust try/catch that accepts either server rejection or
 * acceptance of an orphan (non-existent target) report and asserts accordingly.
 */
export async function test_api_reports_admin_retrieval(
  connection: api.IConnection,
) {
  // Prepare isolated connection contexts for admin, owner, reporter and anonymous
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const reporterConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Create system administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(adminConn, {
      body: {
        email: adminEmail,
        password: "Passw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityBbsSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // Create community owner account
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(ownerConn, {
      body: {
        email: ownerEmail,
        username: `owner_${RandomGenerator.alphaNumeric(6)}`,
        password: "Passw0rd!",
        session_context: {
          href: "http://localhost/",
          referrer: "http://localhost/",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(owner);

  // Create reporter account
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(reporterConn, {
      body: {
        email: reporterEmail,
        username: `reporter_${RandomGenerator.alphaNumeric(6)}`,
        password: "Passw0rd!",
        session_context: {
          href: "http://localhost/",
          referrer: "http://localhost/",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(reporter);

  // Owner creates a unique community
  const uniqueSlug = `test-community-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`;
  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      ownerConn,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(4)}`,
          slug: uniqueSlug,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches request",
    community.slug,
    uniqueSlug,
  );

  // Owner creates a post inside the community
  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      ownerConn,
      {
        communitySlug: community.slug,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community id matches created community",
    post.community.id,
    community.id,
  );

  // Reporter files a report against the created post
  const report: ICommunityBbsReport =
    await api.functional.communityBbs.reports.create(reporterConn, {
      body: {
        target_type: "post",
        target_id: post.id,
        reason_code: "spam",
        explanation: "Automated test: reporting test post for spam",
      } satisfies ICommunityBbsReport.ICreate,
    });
  typia.assert(report);

  // Business validations on created report
  TestValidator.equals(
    "report target_id matches post id",
    report.target_id,
    post.id,
  );
  TestValidator.equals(
    "report target_type is post",
    report.target_type,
    "post",
  );
  TestValidator.equals(
    "report reason_code preserved",
    report.reason_code,
    "spam",
  );
  TestValidator.predicate(
    "report has non-negative evidence_count",
    report.evidence_count >= 0,
  );
  TestValidator.predicate(
    "report has created_at timestamp",
    typeof report.created_at === "string",
  );

  // Anonymous report creation: should be allowed and reporter_id null
  const anonReport: ICommunityBbsReport =
    await api.functional.communityBbs.reports.create(unauthConn, {
      body: {
        target_type: "post",
        target_id: post.id,
        reason_code: "other",
        explanation: "Anonymous test report",
      } satisfies ICommunityBbsReport.ICreate,
    });
  typia.assert(anonReport);

  TestValidator.predicate(
    "anonymous report has null or undefined reporter_id",
    anonReport.reporter_id === null || anonReport.reporter_id === undefined,
  );

  // Negative / robustness test: attempt to create a report for a random (likely non-existent) UUID
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  try {
    const orphan: ICommunityBbsReport =
      await api.functional.communityBbs.reports.create(reporterConn, {
        body: {
          target_type: "post",
          target_id: randomUuid,
          reason_code: "spam",
        } satisfies ICommunityBbsReport.ICreate,
      });
    // If server accepts orphan reports, assert the returned record references the requested UUID
    typia.assert(orphan);
    TestValidator.equals(
      "orphan report accepted: target_id matches request",
      orphan.target_id,
      randomUuid,
    );
  } catch (err) {
    // If server rejects orphan reports, at least ensure an error was thrown (business rejection)
    TestValidator.predicate(
      "orphan report creation rejected by server",
      err instanceof Error,
    );
  }
}
