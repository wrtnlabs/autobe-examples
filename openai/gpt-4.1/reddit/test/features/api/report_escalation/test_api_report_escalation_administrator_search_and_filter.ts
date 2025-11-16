import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportEscalation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportEscalation";

/**
 * Test search and filter of report escalations by administrator, with robust
 * business checks.
 */
export async function test_api_report_escalation_administrator_search_and_filter(
  connection: api.IConnection,
) {
  // 1. Administrator joins and is authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    business_status: null,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth); // now connection is authenticated as admin

  // 2. Search escalated reports with no filter (all visible to admin)
  const page1 =
    await api.functional.communityPlatform.administrator.reportEscalations.index(
      connection,
      {
        body: {
          // No filters – show all visible, paginated
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "pagination info present",
    typeof page1.pagination,
    "object",
  );
  TestValidator.predicate("data array present", Array.isArray(page1.data));
  // All results should have valid escalation status & assigned/visible to admin
  await ArrayUtil.asyncForEach(page1.data, async (esc) => {
    typia.assert(esc);
    // Ensure at least a report object and escalation_reason string, status string, created/updated timestamps are present
    TestValidator.predicate(
      "report object exists",
      typeof esc.report === "object" && esc.report !== null,
    );
    TestValidator.predicate(
      "escalation reason is string",
      typeof esc.escalation_reason === "string" &&
        esc.escalation_reason.length > 0,
    );
    TestValidator.predicate(
      "escalation status is string",
      typeof esc.escalation_status === "string" &&
        esc.escalation_status.length > 0,
    );
    TestValidator.predicate(
      "created_at is string",
      typeof esc.created_at === "string" && esc.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated_at is string",
      typeof esc.updated_at === "string" && esc.updated_at.length > 0,
    );
    // If assigned admin, should match this admin or be visible case
    if (
      esc.escalated_to_administrator !== null &&
      esc.escalated_to_administrator !== undefined
    ) {
      TestValidator.equals(
        "escalated_to_administrator.id present",
        typeof esc.escalated_to_administrator.id,
        "string",
      );
    }
  });

  // 3. Search by escalation_status (simulate by rerunning with example status: 'in_progress')
  const statusPage =
    await api.functional.communityPlatform.administrator.reportEscalations.index(
      connection,
      {
        body: {
          escalation_status: "in_progress",
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(statusPage);
  await ArrayUtil.asyncForEach(statusPage.data, async (esc) => {
    typia.assert(esc);
    TestValidator.equals(
      "filtered escalation status",
      esc.escalation_status,
      "in_progress",
    );
  });

  // 4. Search for items assigned to this admin (visible-to-admin constraint)
  const adminId = adminAuth.id;
  const assignedPage =
    await api.functional.communityPlatform.administrator.reportEscalations.index(
      connection,
      {
        body: {
          escalated_to_administrator_id: adminId,
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(assignedPage);
  await ArrayUtil.asyncForEach(assignedPage.data, async (esc) => {
    typia.assert(esc);
    if (
      esc.escalated_to_administrator !== null &&
      esc.escalated_to_administrator !== undefined
    ) {
      TestValidator.equals(
        "escalated_to_administrator matches",
        esc.escalated_to_administrator.id,
        adminId,
      );
    }
  });

  // 5. Unauthenticated access: create unauthenticated connection and verify error is thrown
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated reportEscalations search is not allowed",
    async () => {
      await api.functional.communityPlatform.administrator.reportEscalations.index(
        unauthConn,
        {
          body: {
            page: 1 as number & tags.Type<"int32">,
            limit: 1 as number & tags.Type<"int32">,
          },
        },
      );
    },
  );
}
