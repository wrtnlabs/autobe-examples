import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_timelog } from "../prepare/prepare_random_hrm_timelog";

/**
 * Generate a random HRM timelog entry via the API for E2E testing.
 *
 * Prepares random timelog data using the prepare function, then calls the creation endpoint to record a discrete work session. The timelog includes project reference, optional task assignment, work date, duration in minutes, description, and billable status.
 *
 * This function is used to create time tracking entries that can later be aggregated into timesheets for weekly approval workflows. The authenticated employee can only create timelogs for themselves, and the referenced project must belong to the specified organization with the employee assigned to it.
 *
 * @param connection Connection information for the API server
 * @param props.body Optional partial timelog creation data to customize the generated test data
 * @param props.params.organizationId Unique identifier of the organization (required)
 * @returns The created timelog entity with all system-generated fields
 */
export async function generate_random_hrm_member_organizations_timelogs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimelog.ICreate>;
    params: {
      organizationId: string;
    };
  },
): Promise<IHrmTimelog> {
  const prepared: IHrmTimelog.ICreate = prepare_random_hrm_timelog(props.body);
  const result: IHrmTimelog =
    await api.functional.hrm.member.organizations.timelogs.create(connection, {
      organizationId: props.params.organizationId,
      body: prepared,
    });
  return result;
}
