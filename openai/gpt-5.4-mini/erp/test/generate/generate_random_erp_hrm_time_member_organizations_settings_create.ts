import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_organization_setting } from "../prepare/prepare_random_erp_hrm_time_organization_setting";

export async function generate_random_erp_hrm_time_member_organizations_settings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeOrganizationSetting.ICreate> | undefined;
    params: {
      organizationId: string;
    };
  },
): Promise<IErpHrmTimeOrganizationSetting> {
  const prepared: IErpHrmTimeOrganizationSetting.ICreate =
    prepare_random_erp_hrm_time_organization_setting(props.body);
  const result: IErpHrmTimeOrganizationSetting =
    await api.functional.erpHrmTime.member.organizations.settings.create(
      connection,
      {
        body: prepared,
        organizationId: props.params.organizationId,
      },
    );
  return result;
}
