import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";

export async function test_api_report_retrieval_by_reporter(
  connection: api.IConnection,
) {
  // 1) Register a new member (reporter)
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterUsername = RandomGenerator.alphaNumeric(8);
  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      username: reporterUsername,
      email: reporterEmail,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPortalMember.ICreate,
  });
  typia.assert(reporter);

  // 2) Create a community
  const communityBody = {
    name: `tst-${RandomGenerator.alphaNumeric(6)}`,
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Create a text post in the community
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
  } satisfies ICommunityPortalPost.ICreate.IText;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4) File a report targeting the post -- use camelCase property names matching DTO
  const reportCreateBody = {
    postId: post.id,
    reasonCode: "spam",
    reasonText: "Automated test: suspected spam post",
    isUrgent: false,
    severity: "low",
    reporterContactEmail: reporterEmail,
  } satisfies ICommunityPortalReport.ICreate;

  const createdReport: ICommunityPortalReport =
    await api.functional.communityPortal.member.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(createdReport);

  // 5) Retrieve the report via GET by reportId
  const retrieved: ICommunityPortalReport =
    await api.functional.communityPortal.member.reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert(retrieved);

  // 6) Validations (use TestValidator)
  TestValidator.equals(
    "report id should match created report",
    retrieved.id,
    createdReport.id,
  );
  if (
    createdReport.reporterUserId !== null &&
    createdReport.reporterUserId !== undefined
  ) {
    TestValidator.equals(
      "reporterUserId equals created reporter id",
      retrieved.reporterUserId,
      reporter.id,
    );
  }
  TestValidator.equals(
    "report targets the same post",
    retrieved.postId,
    createdReport.postId ?? post.id,
  );
  TestValidator.equals(
    "reason code preserved",
    retrieved.reasonCode,
    createdReport.reasonCode ?? reportCreateBody.reasonCode,
  );
  TestValidator.equals(
    "reason text preserved",
    retrieved.reasonText,
    createdReport.reasonText ?? reportCreateBody.reasonText,
  );
  TestValidator.predicate(
    "status is present",
    typeof retrieved.status === "string" && retrieved.status.length > 0,
  );
  TestValidator.predicate(
    "createdAt is ISO date-time string",
    typeof retrieved.createdAt === "string" && retrieved.createdAt.length > 0,
  );

  if (
    retrieved.reporterContactEmail !== null &&
    retrieved.reporterContactEmail !== undefined
  ) {
    TestValidator.equals(
      "reporter contact email visible to reporter",
      retrieved.reporterContactEmail,
      reporterEmail,
    );
  }
}
