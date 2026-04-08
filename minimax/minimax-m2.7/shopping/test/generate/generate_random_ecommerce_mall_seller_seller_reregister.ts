import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_seller } from "../prepare/prepare_random_ecommerce_mall_seller";

/**
 * Generate a random rejected seller reregistration for E2E testing.
 *
 * Creates test data for a rejected seller attempting to resubmit their registration request.
 * This simulates the scenario where a previously rejected seller wants to reapply for seller status.
 * The preparation function generates randomized seller credentials while allowing field overrides
 * for specific test scenarios.
 *
 * @param connection - API connection configuration
 * @param props.body - Optional DeepPartial overrides for the seller registration data
 * @returns Promise resolving to the IReregisterResponse containing updated seller info and JWT tokens
 */
export async function generate_random_ecommerce_mall_seller_seller_reregister(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallSeller.ICreate>;
  },
): Promise<IEcommerceMallSeller.IReregisterResponse> {
  const prepared: IEcommerceMallSeller.ICreate =
    prepare_random_ecommerce_mall_seller(props.body);
  const result: IEcommerceMallSeller.IReregisterResponse =
    await api.functional.ecommerceMall.seller.seller.reregister(connection, {
      body: prepared,
    });
  return result;
}
