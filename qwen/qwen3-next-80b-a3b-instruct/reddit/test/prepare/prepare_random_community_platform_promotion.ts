import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
export function prepare_random_community_platform_promotion(
  input?: DeepPartial<ICommunityPlatformPromotion.ICreate> | undefined,
): ICommunityPlatformPromotion.ICreate {
  // Define one of discountPercentage or discountAmount to satisfy requirement that at least one must be provided
  // We'll always ensure discountPercentage is defined since discountAmount is optional
  const discountPercentage =
    input?.discountPercentage ??
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>
    >();
  const discountAmount =
    input?.discountAmount ??
    (input?.discountPercentage === undefined
      ? typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>()
      : undefined);
  return {
    promotionType:
      input?.promotionType ??
      RandomGenerator.pick(["product", "community", "content"] as const),
    targetId: typia.random<string & tags.Format<"uuid">>(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    discountPercentage,
    discountAmount,
    visibility:
      input?.visibility ??
      RandomGenerator.pick(["public", "private", "friends-only"] as const),
    maxUses:
      input?.maxUses ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    code:
      input?.code ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<6> & tags.Maximum<20>
        >(),
      ),
    notes:
      input?.notes ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
    targetCategoryIds:
      input?.targetCategoryIds ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        () => typia.random<string & tags.Format<"uuid">>(),
      ),
  };
}
