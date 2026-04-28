import { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce platform product image creation data for E2E testing.
 *
 * Generates a complete `IEcommercePlatformProductImage.ICreate` with randomized values.
 * The `uri` property receives a random URL pointing to an image resource.
 *
 * Accepts a `DeepPartial<IEcommercePlatformProductImage.ICreate>` input to override
 * specific properties for targeted test scenarios.
 */
export function prepare_random_ecommerce_platform_product_image(
  input?: DeepPartial<IEcommercePlatformProductImage.ICreate>,
): IEcommercePlatformProductImage.ICreate {
  return {
    uri: input?.uri ?? typia.random<string & tags.Format<"url">>(),
  };
}
