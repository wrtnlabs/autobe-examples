import { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_admin_user_ban_of_customer(
  input?: DeepPartial<IEcommerceAdminUserBanOfCustomer.ICreate> | undefined,
): IEcommerceAdminUserBanOfCustomer.ICreate {
  return {
    ecommerce_administrative_action_id:
      input?.ecommerce_administrative_action_id ??
      typia.random<string & tags.Format<"uuid">>(),
    ecommerce_customer_id:
      input?.ecommerce_customer_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
