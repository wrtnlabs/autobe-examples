import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_organization } from "../prepare/prepare_random_erp_hrm_organization";

export async function generate_random_erp_hrm_member_organizations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmOrganization.ICreate>;
  },
): Promise<IErpHrmOrganization> {
  const prepared: IErpHrmOrganization.ICreate =
    prepare_random_erp_hrm_organization(props.body);
  const result: IErpHrmOrganization =
    await api.functional.erpHrm.member.organizations.create(connection, {
      body: prepared,
    });
  return result;
}
