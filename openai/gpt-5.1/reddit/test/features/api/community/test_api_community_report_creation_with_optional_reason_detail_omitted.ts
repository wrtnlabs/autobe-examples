import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";

export async function test_api_community_report_creation_with_optional_reason_detail_omitted(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // optional ip intentionally omitted to exercise optional/nullable behaviour
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a new community as this member user
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
      { body: communityBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community owner matches member user",
    community.owner_memberuser_id,
    memberAuthorized.id,
  );

  // 3. Create a community-level report omitting reason_detail
  const reasonCategory = "spam";
  const reportBody = {
    community_id: community.id,
    reason_category: reasonCategory,
    // reason_detail intentionally omitted to validate optional-nullable behaviour
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const report: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(report);

  // 4. Business validations on response
  // Basic identity checks
  TestValidator.equals(
    "report community_id matches requested community_id",
    report.community_id,
    community.id,
  );

  TestValidator.equals(
    "report reason_category matches requested reason_category",
    report.reason_category,
    reasonCategory,
  );

  // reporter_memberuser_id should match the authenticated member user
  TestValidator.equals(
    "reporter_memberuser_id should equal authenticated member user id",
    report.reporter_memberuser_id,
    memberAuthorized.id,
  );

  // reporter_adminuser_id and assigned_adminuser_id should be unset (null or undefined)
  TestValidator.equals(
    "reporter_adminuser_id should be null or undefined",
    report.reporter_adminuser_id ?? null,
    null,
  );

  TestValidator.equals(
    "assigned_adminuser_id should be null or undefined",
    report.assigned_adminuser_id ?? null,
    null,
  );

  // reason_detail should be treated as null/undefined when omitted
  TestValidator.equals(
    "reason_detail should be null or undefined when omitted in request",
    report.reason_detail ?? null,
    null,
  );

  // status and severity should be non-empty strings (defaulted by backend)
  TestValidator.predicate(
    "status should be a non-empty string",
    typeof report.status === "string" && report.status.length > 0,
  );

  TestValidator.predicate(
    "severity should be a non-empty string",
    typeof report.severity === "string" && report.severity.length > 0,
  );

  // created_at and updated_at should be valid date-time strings and updated_at >= created_at
  TestValidator.predicate(
    "created_at should be a non-empty date-time string",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty date-time string",
    typeof report.updated_at === "string" && report.updated_at.length > 0,
  );

  const createdAtDate = new Date(report.created_at);
  const updatedAtDate = new Date(report.updated_at);

  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );
}
