import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_seller_profile_snapshot(
  input?: DeepPartial<IShoppingMallSellerProfileSnapshot.ICreate> | undefined,
): IShoppingMallSellerProfileSnapshot.ICreate {
  return {
    shopName:
      input?.shopName ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 7,
      }),
    logoUrl: input?.logoUrl ?? typia.random<string & tags.Format<"uri">>(),
  };
}
