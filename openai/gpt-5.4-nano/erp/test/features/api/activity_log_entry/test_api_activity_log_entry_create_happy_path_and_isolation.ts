import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_activity_log_entries_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_activity_log_entries_create";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { prepare_random_erp_hrm_time_tracking_activity_log_entry } from "../../../prepare/prepare_random_erp_hrm_time_tracking_activity_log_entry";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";

export async function test_api_activity_log_entry_create_happy_path_and_isolation(
  connection: api.IConnection,
): Promise<void> {
  const callTime = new Date();
  const callTimeIso = callTime.toISOString();
  // 1) Register a new member via join to obtain authorization for subsequent member calls
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!23456789",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/organization/join",
    referrer: "https://example.com/home",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: memberJoinInput,
  });
  typia.assert(authorized);
  // 2) Create a project target within the same selected organization context
  const createdProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          color: "#3b82f6",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(createdProject);
  // 3) Create activity log entry referencing the created project
  const occurredAt = RandomGenerator.date(new Date(), 1000 * 60).toISOString();
  const actionType = "project.created";
  const summary = `Created project ${createdProject.name}`;
  const details = RandomGenerator.paragraph({ sentences: 1 });
  const createdLogEntry =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entries_create(
      memberConnection,
      {
        body: {
          action_type: actionType,
          target_entity_type: "project",
          target_entity_id: createdProject.id,
          summary,
          details,
          occurred_at: occurredAt,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.ICreate,
      },
    );
  typia.assert(createdLogEntry);
  // 4) Validate response body and persistence integrity
  TestValidator.equals(
    "performed_by_member_id should match authenticated member",
    createdLogEntry.performed_by_member_id,
    authorized.id,
  );
  TestValidator.equals(
    "organization_id should match selected organization context",
    createdLogEntry.organization_id,
    createdProject.erp_hrm_time_tracking_organization_id,
  );
  TestValidator.equals(
    "action_type should match",
    createdLogEntry.action_type,
    actionType,
  );
  TestValidator.equals(
    "summary should match",
    createdLogEntry.summary,
    summary,
  );
  TestValidator.equals(
    "details should match",
    createdLogEntry.details,
    details,
  );
  TestValidator.equals(
    "occurred_at should match",
    createdLogEntry.occurred_at,
    occurredAt,
  );
  TestValidator.equals(
    "target_entity_type should match",
    createdLogEntry.target_entity_type,
    "project",
  );
  TestValidator.equals(
    "target_entity_id should match",
    createdLogEntry.target_entity_id,
    createdProject.id,
  );
  TestValidator.equals(
    "deleted_at should be null",
    createdLogEntry.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at should not be after the call time",
    createdLogEntry.created_at <= callTimeIso,
  );
}
