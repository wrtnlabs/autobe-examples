import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_organization_context(
  input?: DeepPartial<IErpHrmOrganizationContext.ICreate>,
): IErpHrmOrganizationContext.ICreate {
  return {
    organizationId:
      input?.organizationId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
