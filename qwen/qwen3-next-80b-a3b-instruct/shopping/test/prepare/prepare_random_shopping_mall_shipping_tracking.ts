import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingTracking";
import { IShoppingMallPackageDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPackageDimensions";
export function prepare_random_shopping_mall_shipping_tracking(
  input?: DeepPartial<IShoppingMallShippingTracking.ICreate>,
): IShoppingMallShippingTracking.ICreate {
  return {
    estimated_delivery_date:
      input?.estimated_delivery_date ??
      typia.random<string & tags.Format<"date-time">>(),
    package_weight:
      input?.package_weight ??
      typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>(),
    package_dimensions:
      input?.package_dimensions ??
      typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>(),
    carrier_service_level:
      input?.carrier_service_level ??
      RandomGenerator.pick(["standard", "express", "overnight"] as const),
  };
}
