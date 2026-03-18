import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";

export async function test_api_project_detail_retrieve_scoped_and_deleted_handling(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: retrieve within same organization and verify deleted_at null
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: `memberA_${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}@test.local`,
      password: `P@ssw0rd_${RandomGenerator.alphabets(10)}`,
      organizationName: `orgA_${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://ref.example.com/${RandomGenerator.alphabets(8)}`,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  const memberAProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberAConnection,
      {
        body: {
          name: `projectA_${RandomGenerator.alphabets(8)}`,
          color: "#123ABC",
        },
      },
    );
  typia.assert(memberAProject);
  const memberAProjectDetail =
    await api.functional.erpHrmTimeTracking.member.projects.at(
      memberAConnection,
      {
        projectId: memberAProject.id,
      },
    );
  typia.assert(memberAProjectDetail);
  TestValidator.equals(
    "project id matches",
    memberAProjectDetail.id,
    memberAProject.id,
  );
  TestValidator.equals(
    "project name matches",
    memberAProjectDetail.name,
    memberAProject.name,
  );
  TestValidator.equals(
    "project color matches",
    memberAProjectDetail.color,
    memberAProject.color,
  );
  TestValidator.equals(
    "project status matches",
    memberAProjectDetail.status,
    memberAProject.status,
  );
  TestValidator.equals(
    "project created_at matches",
    memberAProjectDetail.created_at,
    memberAProject.created_at,
  );
  TestValidator.equals(
    "project updated_at matches",
    memberAProjectDetail.updated_at,
    memberAProject.updated_at,
  );
  TestValidator.equals(
    "project deleted_at is null",
    memberAProjectDetail.deleted_at,
    null,
  );
  TestValidator.equals(
    "project tenant scoping matches",
    memberAProjectDetail.erp_hrm_time_tracking_organization_id,
    memberAProject.erp_hrm_time_tracking_organization_id,
  );
  // Scenario 2: deny access when project belongs to different organization
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: `memberB_${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}@test.local`,
      password: `P@ssw0rd_${RandomGenerator.alphabets(10)}`,
      organizationName: `orgB_${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 2,
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://ref.example.com/${RandomGenerator.alphabets(8)}`,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  await TestValidator.error(
    "should deny cross-organization project access",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.at(
        memberBConnection,
        {
          projectId: memberAProject.id,
        },
      );
    },
  );
  // Scenario 3: soft-deleted project returns deleted_at non-null and read does not restore
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {
    body: {
      email: `memberC_${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}@test.local`,
      password: `P@ssw0rd_${RandomGenerator.alphabets(10)}`,
      organizationName: `orgC_${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://ref.example.com/${RandomGenerator.alphabets(8)}`,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const memberCProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberCConnection,
      {
        body: {
          name: `projectC_${RandomGenerator.alphabets(8)}`,
          color: "#445566",
        },
      },
    );
  typia.assert(memberCProject);
  await api.functional.erpHrmTimeTracking.member.projects.erase(
    memberCConnection,
    {
      projectId: memberCProject.id,
    },
  );
  const deletedDetail1 =
    await api.functional.erpHrmTimeTracking.member.projects.at(
      memberCConnection,
      { projectId: memberCProject.id },
    );
  typia.assert(deletedDetail1);
  const deletedDetail2 =
    await api.functional.erpHrmTimeTracking.member.projects.at(
      memberCConnection,
      { projectId: memberCProject.id },
    );
  typia.assert(deletedDetail2);
  TestValidator.equals(
    "deleted project id matches",
    deletedDetail1.id,
    memberCProject.id,
  );
  TestValidator.equals(
    "deleted project name matches",
    deletedDetail1.name,
    memberCProject.name,
  );
  TestValidator.equals(
    "deleted project color matches",
    deletedDetail1.color,
    memberCProject.color,
  );
  TestValidator.equals(
    "deleted project status matches",
    deletedDetail1.status,
    memberCProject.status,
  );
  TestValidator.equals(
    "deleted_at is non-null",
    deletedDetail1.deleted_at !== null,
    true,
  );
  // Ensure read endpoint doesn't modify state (updated_at stable across two reads)
  TestValidator.equals(
    "updated_at stable after read",
    deletedDetail2.updated_at,
    deletedDetail1.updated_at,
  );
  TestValidator.equals(
    "deleted_at stable after read",
    deletedDetail2.deleted_at,
    deletedDetail1.deleted_at,
  );
}
