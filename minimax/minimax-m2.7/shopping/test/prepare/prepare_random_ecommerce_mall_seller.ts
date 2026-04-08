import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce mall seller creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallSeller.ICreate with randomized values for
 * testing seller registration flows. All properties are customizable through
 * the optional input parameter for specific test scenarios.
 *
 * @param input - Optional DeepPartial override for any field
 * @returns Complete IEcommerceMallSeller.ICreate object
 */
export function prepare_random_ecommerce_mall_seller(
  input?: DeepPartial<IEcommerceMallSeller.ICreate>,
): IEcommerceMallSeller.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    password: input?.password ?? RandomGenerator.alphaNumeric(12),
    href: input?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer: input?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: input?.ip,
  };
}
