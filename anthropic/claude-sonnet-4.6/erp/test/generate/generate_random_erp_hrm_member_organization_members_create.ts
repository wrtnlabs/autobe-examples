import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_organization_member } from "../prepare/prepare_random_erp_hrm_organization_member";

export async function generate_random_erp_hrm_member_organization_members_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmOrganizationMember.ICreate> | undefined;
  },
): Promise<IErpHrmOrganizationMember> {
  const prepared: IErpHrmOrganizationMember.ICreate =
    prepare_random_erp_hrm_organization_member(props.body);
  return await api.functional.erpHrm.member.organizationMembers.create(
    connection,
    {
      body: prepared,
    },
  );
}
