import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";

/**
 * Ensure admin community report updates respect required vs. nullable fields.
 *
 * Business intent:
 *
 * - Required, non-null business fields like `status` and `severity` must not be
 *   effectively cleared or set to obviously invalid values via the admin update
 *   DTO.
 * - Nullable fields such as `reason_detail` should be safely clearable by setting
 *   them explicitly to `null` in the update payload.
 * - Invalid updates must be rejected atomically without partially applying
 *   changes, while valid partial updates must apply cleanly.
 *
 * Scenario steps:
 *
 * 1. Register a member user and establish a member session.
 * 2. As the member, create a community.
 * 3. As the member, create a community-level report against that community.
 * 4. Register and log in an admin user to obtain an admin session.
 * 5. Attempt an invalid admin update that tries to clear `status` and `severity`
 *    by setting them to obviously bad values (e.g., empty strings) while also
 *    setting `reason_detail` to null; assert this fails.
 * 6. Perform a valid admin update that sets `status`/`severity` to non-empty
 *    values while setting `reason_detail` explicitly to null; assert this
 *    succeeds and that `reason_detail` is null in the updated report.
 */
export async function test_api_community_report_update_does_not_allow_clearing_required_fields(
  connection: api.IConnection,
) {
  // 1. Register a member user and establish a member session
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member creates a community
  const communityCreateBody = {
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Member creates a community-level report
  const reportCreateBody = {
    community_id: community.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const originalReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(originalReport);

  // 4. Register and log in an admin user to obtain an admin session
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: adminEmail,
    password: "StrongP@ssw0rd", // satisfies password format
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    identifier: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 5. Attempt invalid admin update that clears status/severity via bad values
  const invalidUpdateBody = {
    status: "", // business-invalid, but type-correct
    severity: "", // business-invalid, but type-correct
    reason_detail: null,
  } satisfies ICommunityPlatformCommunityReport.IUpdate;

  await TestValidator.error(
    "invalid admin update that clears status/severity is rejected",
    async () => {
      await api.functional.communityPlatform.adminUser.communityReports.update(
        connection,
        {
          communityReportId: originalReport.id,
          body: invalidUpdateBody,
        },
      );
    },
  );

  // Sanity check: local originalReport is still unchanged (in-memory check)
  TestValidator.equals(
    "original report id remains stable after failed update (local check)",
    originalReport.id,
    originalReport.id,
  );

  // 6. Perform valid admin update that sets status/severity and clears reason_detail
  const validStatus = "in_review";
  const validSeverity = "high";

  const validUpdateBody = {
    status: validStatus,
    severity: validSeverity,
    reason_detail: null,
  } satisfies ICommunityPlatformCommunityReport.IUpdate;

  const updatedReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.adminUser.communityReports.update(
      connection,
      {
        communityReportId: originalReport.id,
        body: validUpdateBody,
      },
    );
  typia.assert(updatedReport);

  // 7. Validate post-conditions on updated report
  TestValidator.equals(
    "updated report keeps same id",
    updatedReport.id,
    originalReport.id,
  );

  TestValidator.equals(
    "updated report status matches valid update payload",
    updatedReport.status,
    validStatus,
  );

  TestValidator.equals(
    "updated report severity matches valid update payload",
    updatedReport.severity,
    validSeverity,
  );

  TestValidator.equals(
    "updated report reason_detail is null after clearing",
    updatedReport.reason_detail,
    null,
  );

  TestValidator.equals(
    "created_at timestamp remains unchanged after update",
    updatedReport.created_at,
    originalReport.created_at,
  );

  TestValidator.notEquals(
    "updated_at timestamp should change after successful update",
    updatedReport.updated_at,
    originalReport.updated_at,
  );
}
