import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_organization_membership } from "../prepare/prepare_random_erp_hrm_time_organization_membership";

export async function generate_random_erp_hrm_time_member_organization_memberships_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeOrganizationMembership.ICreate> | undefined;
  },
): Promise<IErpHrmTimeOrganizationMembership> {
  const prepared: IErpHrmTimeOrganizationMembership.ICreate =
    prepare_random_erp_hrm_time_organization_membership(props.body);
  return await api.functional.erpHrmTime.member.organizationMemberships.create(
    connection,
    {
      body: prepared,
    },
  );
}
