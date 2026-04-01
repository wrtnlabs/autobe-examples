import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_organization } from "../prepare/prepare_random_erp_hrm_time_organization";

export async function generate_random_erp_hrm_time_member_organizations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeOrganization.ICreate> | undefined;
  },
): Promise<IErpHrmTimeOrganization> {
  const prepared: IErpHrmTimeOrganization.ICreate =
    prepare_random_erp_hrm_time_organization(props.body);
  return await api.functional.erpHrmTime.member.organizations.create(
    connection,
    {
      body: prepared,
    },
  );
}
