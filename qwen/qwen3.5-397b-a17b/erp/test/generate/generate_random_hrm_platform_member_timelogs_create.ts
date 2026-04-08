import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_timelog } from "../prepare/prepare_random_hrm_platform_timelog";

/**
 * Generate a random HRM platform timelog via the API for E2E testing.
 *
 * Prepares random timelog data using the prepare function, then calls the creation endpoint
 * to create an actual timelog record in the system. The timelog represents a discrete period
 * of work performed by an employee on a specific project, with optional task reference and
 * description. Billable defaults to true per backend specification.
 *
 * The generated timelog is created without timesheet assignment and will be automatically
 * included when the employee creates a draft timesheet for the corresponding week period.
 *
 * @param connection - API connection information for the test server
 * @param props - Optional props for customizing the timelog data
 * @param props.body - Optional partial timelog creation data for test-time customization
 * @returns The created IHrmPlatformTimelog entity with all fields populated
 */
export async function generate_random_hrm_platform_member_timelogs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformTimelog.ICreate>;
  },
): Promise<IHrmPlatformTimelog> {
  const prepared: IHrmPlatformTimelog.ICreate =
    prepare_random_hrm_platform_timelog(props.body);
  const result: IHrmPlatformTimelog =
    await api.functional.hrmPlatform.member.timelogs.create(connection, {
      body: prepared,
    });
  return result;
}
