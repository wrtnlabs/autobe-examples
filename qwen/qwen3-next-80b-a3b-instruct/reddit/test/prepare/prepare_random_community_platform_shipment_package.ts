import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
export function prepare_random_community_platform_shipment_package(
  input?: DeepPartial<ICommunityPlatformShipmentPackage.ICreate> | undefined,
): ICommunityPlatformShipmentPackage.ICreate {
  return {
    shipment_id:
      input?.shipment_id ?? typia.random<string & tags.Format<"uuid">>(),
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    weight_grams:
      input?.weight_grams ?? typia.random<number & tags.Minimum<0>>(),
    tracking_number:
      input?.tracking_number ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
      ),
    carrier_id:
      input?.carrier_id ?? typia.random<string & tags.Format<"uuid">>(),
    insurance_value_usd:
      input?.insurance_value_usd ?? typia.random<number & tags.Minimum<0>>(),
    special_instructions:
      input?.special_instructions ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        wordMin: 4,
        wordMax: 8,
      }),
  };
}
