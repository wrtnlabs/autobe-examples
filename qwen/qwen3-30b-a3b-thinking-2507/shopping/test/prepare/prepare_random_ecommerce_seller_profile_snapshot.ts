import { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_seller_profile_snapshot(
  input?: DeepPartial<IEcommerceSellerProfileSnapshot.ICreate>,
): IEcommerceSellerProfileSnapshot.ICreate {
  return {
    shop_name_before: input?.shop_name_before ?? RandomGenerator.name(),
    description_before:
      input?.description_before ?? RandomGenerator.paragraph({ sentences: 3 }),
    logo_before:
      input?.logo_before ??
      (Math.random() > 0.5
        ? null
        : typia.random<string & tags.Format<"url">>()),
    shop_name_after: input?.shop_name_after ?? RandomGenerator.name(),
    description_after:
      input?.description_after ?? RandomGenerator.paragraph({ sentences: 3 }),
    logo_after:
      input?.logo_after ??
      (Math.random() > 0.5
        ? null
        : typia.random<string & tags.Format<"url">>()),
    ecommerce_seller_profiles_id:
      input?.ecommerce_seller_profiles_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
