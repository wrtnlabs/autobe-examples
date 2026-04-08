import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_department_hierarchy_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new member
  // The member join creates a new organization for the user automatically
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Get department hierarchy for the organization (which has no departments)
  // The hierarchy endpoint uses the current organization context from the session
  const hierarchy =
    await api.functional.erpHrm.member.departments.hierarchy(memberConnection);
  typia.assert(hierarchy);
  // 3. Validate that the response has valid structure with empty children
  // Since no departments were created, children should be an empty array
  TestValidator.equals(
    "hierarchy has empty children array",
    hierarchy.children.length,
    0,
  );
  TestValidator.predicate(
    "hierarchy has valid structure with id and name",
    hierarchy.id !== undefined && hierarchy.name !== undefined,
  );
  TestValidator.equals(
    "hierarchy parent is null (root level)",
    hierarchy.parent,
    null,
  );
}
