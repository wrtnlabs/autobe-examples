import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
export function prepare_random_community_platform_shipment(
  input?: DeepPartial<ICommunityPlatformShipment.ICreate>,
): ICommunityPlatformShipment.ICreate {
  return {
    notes:
      input?.notes ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
    packages: input?.packages
      ? input.packages.map((pkg) => ({
          shipment_id:
            pkg.shipment_id ?? typia.random<string & tags.Format<"uuid">>(),
          product_id:
            pkg.product_id ?? typia.random<string & tags.Format<"uuid">>(),
          quantity:
            pkg.quantity ??
            typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          weight_grams:
            pkg.weight_grams ?? typia.random<number & tags.Minimum<0>>(),
          tracking_number:
            pkg.tracking_number ??
            RandomGenerator.alphaNumeric(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<5> &
                  tags.Maximum<20>
              >(),
            ),
          carrier_id:
            pkg.carrier_id ?? typia.random<string & tags.Format<"uuid">>(),
          insurance_value_usd:
            pkg.insurance_value_usd ?? typia.random<number & tags.Minimum<0>>(),
          special_instructions:
            pkg.special_instructions ??
            RandomGenerator.paragraph({
              sentences: typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
              >(),
              wordMin: 2,
              wordMax: 5,
            }),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            shipment_id: typia.random<string & tags.Format<"uuid">>(),
            product_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            weight_grams: typia.random<number & tags.Minimum<0>>(),
            tracking_number: RandomGenerator.alphaNumeric(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<5> &
                  tags.Maximum<20>
              >(),
            ),
            carrier_id: typia.random<string & tags.Format<"uuid">>(),
            insurance_value_usd: typia.random<number & tags.Minimum<0>>(),
            special_instructions: RandomGenerator.paragraph({
              sentences: typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
              >(),
              wordMin: 2,
              wordMax: 5,
            }),
          }),
        ),
    shipment_type:
      input?.shipment_type ??
      RandomGenerator.pick(["standard", "express", "freight"] as const),
    exception_handling:
      input?.exception_handling ??
      RandomGenerator.pick([
        "hold",
        "return_to_sender",
        "redeliver",
        "leave_at_door",
      ] as const),
    signature_required:
      input?.signature_required ?? RandomGenerator.pick([true, false] as const),
  };
}