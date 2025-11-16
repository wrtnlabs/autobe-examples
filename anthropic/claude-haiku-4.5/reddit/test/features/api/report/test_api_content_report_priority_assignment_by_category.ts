import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_content_report_priority_assignment_by_category(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create test category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_order: 1,
          description: "Test category for report priority testing",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account to submit reports
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "TestPassword123!",
        href: "http://localhost:3000/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Test priority assignment for different categories
  const priorityTests = [
    { category: "illegal_content", expectedPriority: "critical" },
    { category: "hate_speech", expectedPriority: "high" },
    { category: "harassment", expectedPriority: "medium" },
    { category: "misinformation", expectedPriority: "medium" },
    { category: "spam", expectedPriority: "low" },
    { category: "off_topic", expectedPriority: "low" },
  ];

  for (const test of priorityTests) {
    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.member.reports.create(connection, {
        body: {
          category: test.category,
          reported_member_id: typia.random<string & tags.Format<"uuid">>(),
          additional_details: `Report for ${test.category} violation testing`,
          reporter_contact_email: typia.random<string & tags.Format<"email">>(),
        } satisfies ICommunityPlatformReport.ICreate,
      });
    typia.assert(report);

    TestValidator.equals(
      `priority should be ${test.expectedPriority} for category ${test.category}`,
      report.priority,
      test.expectedPriority,
    );

    TestValidator.equals(
      `status should be submitted for category ${test.category}`,
      report.status,
      "submitted",
    );

    TestValidator.equals(
      `category should be ${test.category}`,
      report.category,
      test.category,
    );
  }
}
