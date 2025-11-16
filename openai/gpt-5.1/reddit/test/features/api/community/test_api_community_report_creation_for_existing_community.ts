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

/**
 * Validate that an authenticated member user can create a community-level
 * report against an existing community and that the created report correctly
 * reflects relationships and system-managed fields.
 *
 * Business flow:
 *
 * 1. Register and authenticate a new member user (join).
 * 2. As that member, create a new community.
 * 3. As the same member, create a community-level report targeting that community.
 * 4. Validate the report structure and linkage (community_id, reporter, status,
 *    severity, timestamps).
 * 5. Validate that unauthenticated clients cannot create community reports.
 */
export async function test_api_community_report_creation_for_existing_community(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a new community as the authenticated member
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
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

  // Basic linkage: owner_memberuser_id should be the authenticated member id
  TestValidator.equals(
    "community owner should be the creator member",
    community.owner_memberuser_id,
    member.id,
  );

  // 3. Create a community-level report for the created community
  const reasonCategoryOptions = ["spam", "abuse", "illegal", "other"] as const;
  const reportBody = {
    community_id: community.id,
    reason_category: RandomGenerator.pick(reasonCategoryOptions),
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const report: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);

  // 4. Validate the report structure and relationships
  TestValidator.equals(
    "report.community_id should match target community id",
    report.community_id,
    community.id,
  );

  // Reporter should be a member user (this actor), not an admin
  TestValidator.equals(
    "reporter_adminuser_id should be null for member-originated report",
    report.reporter_adminuser_id,
    null,
  );

  if (
    report.reporter_memberuser_id !== null &&
    report.reporter_memberuser_id !== undefined
  ) {
    TestValidator.equals(
      "reporter_memberuser_id should match authenticated member id when present",
      report.reporter_memberuser_id,
      member.id,
    );
  }

  // status and severity should be non-empty strings initialized by backend
  TestValidator.predicate(
    "report.status should be a non-empty string",
    typeof report.status === "string" && report.status.length > 0,
  );
  TestValidator.predicate(
    "report.severity should be a non-empty string",
    typeof report.severity === "string" && report.severity.length > 0,
  );

  // created_at and updated_at already type-validated by typia; ensure they are present
  TestValidator.predicate(
    "report.created_at should be present",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );
  TestValidator.predicate(
    "report.updated_at should be present",
    typeof report.updated_at === "string" && report.updated_at.length > 0,
  );

  // Embedded community summary, when present, should match the created community
  if (report.community !== undefined) {
    TestValidator.equals(
      "embedded community summary id should match community id",
      report.community.id,
      community.id,
    );
    TestValidator.equals(
      "embedded community summary slug should match community slug",
      report.community.slug,
      community.slug,
    );
    TestValidator.equals(
      "embedded community summary name should match community name",
      report.community.name,
      community.name,
    );
  }

  // 5. Negative scenario: unauthenticated client cannot create a community report
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated client must not be able to create community report",
    async () => {
      await api.functional.communityPlatform.memberUser.communityReports.create(
        unauthenticated,
        {
          body: reportBody,
        },
      );
    },
  );
}
