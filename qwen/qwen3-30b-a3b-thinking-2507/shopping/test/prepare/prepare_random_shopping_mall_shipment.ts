import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_shipment(
  input?: DeepPartial<IShoppingMallShipment.ICreate> | undefined,
): IShoppingMallShipment.ICreate {
  return {
    trackingNumber:
      input?.trackingNumber ?? `TRK${RandomGenerator.alphaNumeric(6)}`,
    carrier:
      input?.carrier ??
      RandomGenerator.pick([
        "DHL",
        "FedEx",
        "UPS",
        "USPS",
        "YRC",
        "TNT",
      ] as const),
    status: input?.status ?? "pending",
  };
}
