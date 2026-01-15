import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderCancellation";
export function prepare_random_community_platform_order_cancellation(
  input?: DeepPartial<ICommunityPlatformOrderCancellation.ICreate>,
): ICommunityPlatformOrderCancellation.ICreate {
  return {
    // Generate realistic cancellation reason (1-500 characters)
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<10>
        >(),
        wordMin: 3,
        wordMax: 7,
      }).substring(0, 500),
    // Generate optional metadata object with 0-3 random key-value pairs
    metadata:
      input?.metadata ??
      (function () {
        const keys = ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<3>
          >(),
          () => RandomGenerator.alphabets(6),
        );
        return keys.reduce(
          (acc, key) => ({
            ...acc,
            [key]: RandomGenerator.paragraph({ sentences: 1 }),
          }),
          {},
        );
      })(),
  };
}
