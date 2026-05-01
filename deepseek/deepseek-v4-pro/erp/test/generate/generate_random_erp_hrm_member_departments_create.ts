import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_department } from "../prepare/prepare_random_erp_hrm_department";

/**
 * Generate a random ERP HRM department via the API for E2E testing.
 *
 * Prepares random department data using the prepare function, then calls the
 * creation endpoint in the current organization context. The department is
 * created with a randomized name, optional description, and optional parent
 * department reference for hierarchy nesting.
 *
 * The department name must be unique within the organization. When a parent_id
 * is provided, the referenced parent department must exist in the same
 * organization and must not itself have a parent, enforcing the one-level
 * nesting constraint.
 *
 * Only members with the `org:manage` permission may create departments. The
 * caller must provide a connection authenticated with the appropriate
 * authorization context.
 */
export async function generate_random_erp_hrm_member_departments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmDepartment.ICreate> | undefined;
  },
): Promise<IErpHrmDepartment> {
  const prepared: IErpHrmDepartment.ICreate = prepare_random_erp_hrm_department(
    props.body,
  );
  const result: IErpHrmDepartment =
    await api.functional.erpHrm.member.departments.create(connection, {
      body: prepared,
    });
  return result;
}
