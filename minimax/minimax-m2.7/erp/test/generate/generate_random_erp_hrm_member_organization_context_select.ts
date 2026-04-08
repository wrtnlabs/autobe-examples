import api from "@ORGANIZATION/PROJECT-api";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_organization_context } from "../prepare/prepare_random_erp_hrm_organization_context";

export async function generate_random_erp_hrm_member_organization_context_select(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmOrganizationContext.ICreate>;
  }
): Promise<IErpHrmOrganizationContext> {
  const prepared: IErpHrmOrganizationContext.ICreate = prepare_random_erp_hrm_organization_context(
    props.body
  );
  return await api.functional.erpHrm.member.organization_context.select(
    connection,
    {
      body: prepared,
    }
  );
}