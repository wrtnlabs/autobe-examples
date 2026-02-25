import { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_admin_user_ban_of_administrator(
  input?: DeepPartial<IEcommerceAdminUserBanOfAdministrator.ICreate>,
): IEcommerceAdminUserBanOfAdministrator.ICreate {
  return {
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
    action_details:
      input?.action_details ??
      (Math.random() > 0.3
        ? RandomGenerator.paragraph({ sentences: 2 })
        : null),
    previous_state:
      input?.previous_state ??
      (Math.random() > 0.5
        ? RandomGenerator.paragraph({ sentences: 1 })
        : null),
    new_state:
      input?.new_state ??
      (Math.random() > 0.5
        ? RandomGenerator.paragraph({ sentences: 1 })
        : null),
  };
}
