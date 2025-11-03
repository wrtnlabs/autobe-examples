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

export async function test_api_comment_report_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Create author account (separate connection to avoid header collision)
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const authorEmail: string = typia.random<string & tags.Format<"email">>();
  const authorJoin = await api.functional.auth.communityMember.join(
    authorConn,
    {
      body: {
        email: authorEmail,
        username: `author_${RandomGenerator.alphaNumeric(6)}`,
        password: "Passw0rd!",
        session_context: {
          href: "http://localhost/",
          referrer: "http://localhost/",
          ip: null,
          session_ttl_seconds: null,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  typia.assert(authorJoin);
  const author: ICommunityBbsCommunityMember.ISummary = authorJoin.member;
  typia.assert(author);

  // 2. Create reporter account (separate connection)
  const reporterConn: api.IConnection = { ...connection, headers: {} };
  const reporterEmail: string = typia.random<string & tags.Format<"email">>();
  const reporterJoin = await api.functional.auth.communityMember.join(
    reporterConn,
    {
      body: {
        email: reporterEmail,
        username: `reporter_${RandomGenerator.alphaNumeric(6)}`,
        password: "Passw0rd!",
        session_context: {
          href: "http://localhost/",
          referrer: "http://localhost/",
          ip: null,
          session_ttl_seconds: null,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  typia.assert(reporterJoin);
  const reporter: ICommunityBbsCommunityMember.ISummary = reporterJoin.member;
  typia.assert(reporter);

  // 3. As author, create a community with a unique slug
  const uniqueSlug = `test-community-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      authorConn,
      {
        body: {
          name: `Test Community ${RandomGenerator.name(1)}`,
          slug: uniqueSlug,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibility: "public",
          post_approval_required: false,
          // settings omitted to satisfy DTO type (settings?: ISettings.ICreate | undefined)
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches",
    community.slug,
    uniqueSlug,
  );

  // 4. As author, create a post in the community
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      authorConn,
      {
        communitySlug: community.slug,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          post_type: "text",
          link_url: null,
          // media_ids omitted
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);

  // 5. As author, create a comment on the post
  const comment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      authorConn,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          parent_id: null,
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(comment);

  // 6. As reporter, file a report against the comment (happy path)
  const report =
    await api.functional.communityBbs.communityMember.comments.report.create(
      reporterConn,
      {
        commentId: comment.id,
        body: {
          // Provide required DTO fields. Server will also validate path.
          target_type: "comment",
          target_id: comment.id,
          reason_code: "harassment",
          explanation:
            "Reporter found the comment abusive and requesting review.",
        } satisfies ICommunityBbsReport.ICreate,
      },
    );
  typia.assert(report);

  // Business validations
  TestValidator.equals(
    "report target_type is comment",
    report.target_type,
    "comment",
  );
  TestValidator.equals(
    "report target_id equals comment id",
    report.target_id,
    comment.id,
  );
  TestValidator.equals(
    "report reporter attribution",
    report.reporter_id,
    reporter.id,
  );
  TestValidator.predicate(
    "report status present",
    report.status !== null && report.status !== undefined,
  );
  TestValidator.predicate(
    "report priority present",
    report.priority !== null && report.priority !== undefined,
  );
  TestValidator.predicate(
    "evidence_count is numeric",
    typeof report.evidence_count === "number",
  );

  // NOTE: Moderator-scoped listing of reports is not available in the provided
  // SDK function set, so verifying moderator queue visibility cannot be done
  // here. We validate the persisted report DTO instead.

  // 7a. Error case: reporting a non-existent commentId should throw (404)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reporting non-existent comment should fail",
    async () => {
      await api.functional.communityBbs.communityMember.comments.report.create(
        reporterConn,
        {
          commentId: fakeId,
          body: {
            target_type: "comment",
            target_id: fakeId,
            reason_code: "harassment",
            explanation: "This comment does not exist",
          } satisfies ICommunityBbsReport.ICreate,
        },
      );
    },
  );

  // 7b. Error case: overly long explanation should trigger validation error (400)
  const longExplanation = Array(2001).join("x"); // length > 1000
  await TestValidator.error(
    "overly long explanation should fail validation",
    async () => {
      await api.functional.communityBbs.communityMember.comments.report.create(
        reporterConn,
        {
          commentId: comment.id,
          body: {
            target_type: "comment",
            target_id: comment.id,
            reason_code: "harassment",
            explanation: longExplanation,
          } satisfies ICommunityBbsReport.ICreate,
        },
      );
    },
  );
}
