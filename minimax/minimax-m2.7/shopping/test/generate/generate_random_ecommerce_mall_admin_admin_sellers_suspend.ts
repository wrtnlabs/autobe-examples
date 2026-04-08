import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_seller_suspension } from "../prepare/prepare_random_ecommerce_mall_seller_suspension";

/**
 * Generate a random seller suspension via the API for E2E testing.
 *
 * Suspends a seller account with a randomly generated or custom suspension reason.
 * This function creates a suspension record that hides the seller's products from
 * search results and prevents them from listing new products. The suspension
 * creates an immutable audit trail capturing the suspending administrator and
 * timestamp.
 *
 * **Test scenarios:**
 * - Suspend an approved seller and verify products are hidden
 * - Attempt to suspend an already suspended seller (should fail)
 * - Verify suspension audit trail contains correct information
 * - Test admin cannot suspend their own seller account (if applicable)
 *
 * @param connection - API connection with authentication
 * @param props.body - Optional suspension reason override (default: random paragraph)
 * @param props.params.sellerId - UUID of the seller to suspend
 * @returns The created suspension record with seller and admin details
 */
export async function generate_random_ecommerce_mall_admin_admin_sellers_suspend(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallSellerSuspension.ICreate>;
    params: {
      sellerId: string;
    };
  },
): Promise<IEcommerceMallSellerSuspension> {
  const prepared: IEcommerceMallSellerSuspension.ICreate =
    prepare_random_ecommerce_mall_seller_suspension(props.body);
  const result: IEcommerceMallSellerSuspension =
    await api.functional.ecommerceMall.admin.admin.sellers.suspend(connection, {
      sellerId: props.params.sellerId,
      body: prepared,
    });
  return result;
}
