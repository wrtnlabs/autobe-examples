import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import api from "@ORGANIZATION/PROJECT-api";

import { prepare_random_erp_hrm_organization } from "../../test/prepare/prepare_random_erp_hrm_organization";

export async function generate_random_erp_hrm_admin_organizations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmOrganization.ICreate> | undefined;
  }
): Promise<IErpHrmOrganization> {
  const prepared: IErpHrmOrganization.ICreate = prepare_random_erp_hrm_organization(
    props.body
  );
  return await api.functional.erpHrm.admin.organizations.create(connection, {
    body: prepared,
  });
}