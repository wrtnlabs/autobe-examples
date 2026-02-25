import { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_admin_user_ban_of_seller(
  input?: DeepPartial<IEcommerceAdminUserBanOfSeller.ICreate>,
): IEcommerceAdminUserBanOfSeller.ICreate {
  const intervention_type =
    input?.intervention_type ??
    RandomGenerator.pick([
      "account_suspension",
      "selling_restriction",
      "product_removal",
      "warning_issued",
    ] as const);
  return {
    intervention_type,
    suspension_duration_days:
      input?.suspension_duration_days ??
      (intervention_type === "account_suspension"
        ? typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >()
        : null),
    restriction_scope:
      input?.restriction_scope ??
      (intervention_type === "selling_restriction"
        ? RandomGenerator.pick([
            "all_products",
            "specific_categories",
            "new_listings_only",
          ] as const)
        : null),
    effective_from:
      input?.effective_from ??
      typia.random<string & tags.Format<"date-time">>(),
    effective_until:
      input?.effective_until ??
      (intervention_type !== "warning_issued"
        ? typia.random<string & tags.Format<"date-time">>()
        : null),
  };
}