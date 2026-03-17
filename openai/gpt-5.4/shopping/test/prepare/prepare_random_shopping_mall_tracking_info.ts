import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_tracking_info(
  input?: DeepPartial<IShoppingMallTrackingInfo.ICreate>,
): IShoppingMallTrackingInfo.ICreate {
  return {
    carrier_name:
      input?.carrier_name ??
      RandomGenerator.pick([
        "UPS",
        "FedEx",
        "DHL",
        "USPS",
        "CJ Logistics",
        "Korea Post",
      ] as const),
    tracking_number:
      input?.tracking_number ?? RandomGenerator.alphaNumeric(16).toUpperCase(),
    tracking_url:
      input?.tracking_url !== undefined
        ? input.tracking_url
        : typia.random<string & tags.Format<"uri">>(),
  };
}
