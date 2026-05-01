import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_role } from "../prepare/prepare_random_erp_hrm_role";

/**
 * Generate a random ERP HRM custom role via the API for E2E testing.
 *
 * Prepares random role creation data using the prepare function, then calls
 * the role creation endpoint to persist the role. The created role is a custom
 * role with `is_builtin` set to false, distinct from the three built-in roles
 * (Owner, Manager, Employee) that are provisioned automatically at
 * organization creation.
 *
 * The generated role carries a randomized name, an optional description, and
 * a non-empty set of permission keys drawn from the system's permission
 * catalog. All properties can be overridden through the optional DeepPartial
 * body parameter, enabling test scenarios that require specific role
 * configurations such as duplicate-name conflict testing or permission-set
 * validation.
 *
 * The caller must be authenticated and hold the Owner role within the
 * current organization context; otherwise the endpoint responds with 403.
 */
export async function generate_random_erp_hrm_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmRole.ICreate> | undefined;
  },
): Promise<IErpHrmRole> {
  const prepared: IErpHrmRole.ICreate = prepare_random_erp_hrm_role(props.body);
  return await api.functional.erpHrm.roles.create(connection, {
    body: prepared,
  });
}
