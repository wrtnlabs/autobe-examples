import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_organization(
  input?: DeepPartial<IErpHrmTimeOrganization.ICreate> | undefined,
): IErpHrmTimeOrganization.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 2 }),
    logoImageUrl:
      input?.logoImageUrl !== undefined
        ? input.logoImageUrl
        : typia.random<string & tags.Format<"uri">>(),
  };
}
