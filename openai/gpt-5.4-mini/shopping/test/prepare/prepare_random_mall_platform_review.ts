import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform review creation data for E2E testing.
 *
 * Generates a complete IMallPlatformReview.ICreate payload with a valid star
 * rating and optional review content. Test cases may override either field via
 * DeepPartial input, while omitted values are randomized within schema
 * constraints.
 */
export function prepare_random_mall_platform_review(
  input?: DeepPartial<IMallPlatformReview.ICreate> | undefined,
): IMallPlatformReview.ICreate {
  return {
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    content:
      input?.content === undefined
        ? RandomGenerator.paragraph({ sentences: 2 })
        : input.content,
  };
}
