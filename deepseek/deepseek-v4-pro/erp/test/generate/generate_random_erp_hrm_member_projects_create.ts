import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_project } from "../prepare/prepare_random_erp_hrm_project";

/**
 * Generate a random ERP HRM project via the API for E2E testing.
 *
 * Prepares random project data using the prepare function, then calls the creation
 * endpoint to persist the project. The project is created in active status with
 * a random name, hex color code, description, budget hours, and timeline dates.
 *
 * Returns the fully populated project record including server-assigned ID,
 * organization ID from session context, active status, and creation timestamp.
 */
export async function generate_random_erp_hrm_member_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmProject.ICreate> | undefined;
  },
): Promise<IErpHrmProject> {
  const prepared: IErpHrmProject.ICreate = prepare_random_erp_hrm_project(
    props.body,
  );
  return await api.functional.erpHrm.member.projects.create(connection, {
    body: prepared,
  });
}
