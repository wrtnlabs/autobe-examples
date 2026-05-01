import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_timelog } from "../prepare/prepare_random_erp_hrm_timelog";

/**
 * Generate a random timelog via the API for E2E testing.
 *
 * Prepares random timelog creation data using the prepare function, then calls the
 * timelog creation endpoint to persist the record. Each generated timelog includes a
 * required project assignment, an optional task within that project, a date, a positive
 * duration in minutes, an optional description, and a billable flag.
 *
 * The returned timelog includes all server-assigned fields such as the unique
 * identifier, created_at and updated_at timestamps, and resolved relations for the
 * employee, project, task, and timesheet summaries.
 *
 * All properties can be overridden via the `body` parameter using DeepPartial, allowing
 * tests to customize specific fields while using sensible defaults for the rest.
 */
export async function generate_random_erp_hrm_member_timelogs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimelog.ICreate> | undefined;
  },
): Promise<IErpHrmTimelog> {
  const prepared: IErpHrmTimelog.ICreate = prepare_random_erp_hrm_timelog(
    props.body,
  );
  const result: IErpHrmTimelog =
    await api.functional.erpHrm.member.timelogs.create(connection, {
      body: prepared,
    });
  return result;
}
