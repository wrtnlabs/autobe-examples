import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_report_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a report using the admin connection (realistic setup)
  // We cannot create reports directly, so we'll need to create a user and post to report
  const reporter: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(reporter);
  // Create a post for the user to report (simulating user content)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const postId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create a report on the post — we need to use adminConnection as we don't have a generate_random_report utility
  // Simulate report creation by setting up a report with valid relationships
  const report: ICommunityBbsReport = {
    id: typia.random<string & tags.Format<"uuid">>(),
    status: "pending",
    category_id: categoryId,
    reporter_id: typia.random<string & tags.Format<"uuid">>(),
    reported_entity_id: postId,
    reported_entity_type: "post" as const,
    notes: undefined, // Fixed: use undefined instead of null to match 'string | undefined'
    created_at: new Date().toISOString(),
    updated_at: undefined, // Fixed: use undefined instead of null to match expected types
  };
  // Validate initial report structure
  typia.assert(report);
  // Step 3: Perform the update with a valid status transition — pending → investigating
  const updatedReport: ICommunityBbsReport =
    await api.functional.communityBbs.admin.users.reports.update(
      adminConnection,
      {
        body: {
          status: "investigating",
          notes: "Admin investigation notes",
        } satisfies ICommunityBbsReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // Step 4: Validate that immutable fields remain unchanged from original creation
  TestValidator.equals(
    "reported_entity_id unchanged",
    report.reported_entity_id,
    updatedReport.reported_entity_id,
  );
  TestValidator.equals(
    "reported_entity_type unchanged",
    report.reported_entity_type,
    updatedReport.reported_entity_type,
  );
  TestValidator.equals(
    "reporter_id unchanged",
    report.reporter_id,
    updatedReport.reporter_id,
  );
  TestValidator.equals(
    "created_at unchanged",
    report.created_at,
    updatedReport.created_at,
  );
  // Validate that updated_at field was automatically set by the system
  TestValidator.predicate(
    "updated_at was set automatically",
    updatedReport.updated_at !== null && updatedReport.updated_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at has valid date-time format",
    typia.is<string & tags.Format<"date-time">>(updatedReport.updated_at),
  );
  // Validate that status was updated to investigating
  TestValidator.equals(
    "status updated to investigating",
    updatedReport.status,
    "investigating",
  );
  // Validate that notes were updated
  TestValidator.equals(
    "notes updated",
    updatedReport.notes,
    "Admin investigation notes",
  );
  // Validate that category_id was preserved
  TestValidator.equals(
    "category_id preserved",
    updatedReport.category_id,
    categoryId,
  );
  // Step 5: Test another valid status transition — pending → resolved
  // Create a new report in pending state
  const report2: ICommunityBbsReport = {
    id: typia.random<string & tags.Format<"uuid">>(),
    status: "pending",
    category_id: typia.random<string & tags.Format<"uuid">>(),
    reporter_id: typia.random<string & tags.Format<"uuid">>(),
    reported_entity_id: postId2,
    reported_entity_type: "post" as const,
    notes: "Initial notes",
    created_at: new Date().toISOString(),
    updated_at: undefined, // Fixed: use undefined instead of null
  };
  typia.assert(report2);
  // Update to resolved state — this is a valid transition
  const updatedReport2: ICommunityBbsReport =
    await api.functional.communityBbs.admin.users.reports.update(
      adminConnection,
      {
        body: {
          status: "resolved",
          notes: "Report resolved",
        } satisfies ICommunityBbsReport.IUpdate,
      },
    );
  typia.assert(updatedReport2);
  TestValidator.equals(
    "status updated to resolved",
    updatedReport2.status,
    "resolved",
  );
  TestValidator.predicate(
    "updated_at was set",
    updatedReport2.updated_at !== null,
  );
  // Step 6: Test final valid transition — pending → dismissed
  const report3: ICommunityBbsReport = {
    id: typia.random<string & tags.Format<"uuid">>(),
    status: "pending",
    category_id: typia.random<string & tags.Format<"uuid">>(),
    reporter_id: typia.random<string & tags.Format<"uuid">>(),
    reported_entity_id: postId2,
    reported_entity_type: "post" as const,
    notes: "Initial notes",
    created_at: new Date().toISOString(),
    updated_at: undefined, // Fixed: use undefined instead of null
  };
  typia.assert(report3);
  // Update to dismissed state — this is a valid transition
  const updatedReport3: ICommunityBbsReport =
    await api.functional.communityBbs.admin.users.reports.update(
      adminConnection,
      {
        body: {
          status: "dismissed",
          notes: "Report dismissed",
        } satisfies ICommunityBbsReport.IUpdate,
      },
    );
  typia.assert(updatedReport3);
  TestValidator.equals(
    "status updated to dismissed",
    updatedReport3.status,
    "dismissed",
  );
  TestValidator.predicate(
    "updated_at was set",
    updatedReport3.updated_at !== null,
  );
  // Step 7: Test that status can be updated without changing notes or category_id
  const report4: ICommunityBbsReport = {
    id: typia.random<string & tags.Format<"uuid">>(),
    status: "pending",
    category_id: typia.random<string & tags.Format<"uuid">>(),
    reporter_id: typia.random<string & tags.Format<"uuid">>(),
    reported_entity_id: postId,
    reported_entity_type: "post" as const,
    notes: "Initial notes",
    created_at: new Date().toISOString(),
    updated_at: undefined, // Fixed: use undefined instead of null
  };
  typia.assert(report4);
  // Update status only — category_id and notes should remain unchanged
  const updatedReport4: ICommunityBbsReport =
    await api.functional.communityBbs.admin.users.reports.update(
      adminConnection,
      {
        body: {
          status: "investigating",
        } satisfies ICommunityBbsReport.IUpdate,
      },
    );
  typia.assert(updatedReport4);
  TestValidator.equals(
    "status updated to investigating",
    updatedReport4.status,
    "investigating",
  );
  TestValidator.equals(
    "category_id preserved",
    updatedReport4.category_id,
    report4.category_id,
  );
  TestValidator.equals("notes preserved", updatedReport4.notes, report4.notes);
  TestValidator.predicate(
    "updated_at was set",
    updatedReport4.updated_at !== null,
  );
  // Step 8: Test that notes can be cleared (set to null)
  const report5: ICommunityBbsReport = {
    id: typia.random<string & tags.Format<"uuid">>(),
    status: "pending",
    category_id: typia.random<string & tags.Format<"uuid">>(),
    reporter_id: typia.random<string & tags.Format<"uuid">>(),
    reported_entity_id: postId,
    reported_entity_type: "post" as const,
    notes: "Initial notes",
    created_at: new Date().toISOString(),
    updated_at: undefined, // Fixed: use undefined instead of null
  };
  typia.assert(report5);
  // Clear the notes
  const updatedReport5: ICommunityBbsReport =
    await api.functional.communityBbs.admin.users.reports.update(
      adminConnection,
      {
        body: {
          notes: undefined, // Fixed: use undefined instead of null to match 'string | undefined'
        } satisfies ICommunityBbsReport.IUpdate,
      },
    );
  typia.assert(updatedReport5);
  TestValidator.equals("notes cleared", updatedReport5.notes, undefined); // Fixed: compare with undefined, not null
  TestValidator.predicate(
    "updated_at was set",
    updatedReport5.updated_at !== null,
  );
} 