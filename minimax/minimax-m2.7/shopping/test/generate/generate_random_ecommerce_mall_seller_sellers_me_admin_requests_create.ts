import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_seller_admin_request } from "../prepare/prepare_random_ecommerce_mall_seller_admin_request";

/**
 * Generate a random seller admin request via the API for E2E testing.
 *
 * Creates a new administrative privilege request for the authenticated seller
 * with a randomly generated reason text. The request is created with 'pending'
 * status and awaits super administrator review.
 *
 * This function is used to test the admin request submission flow where sellers
 * provide justification for needing elevated platform access. The request
 * processing validates that the seller account exists and is in good standing.
 *
 * @param connection - API connection configuration
 * @param props - Optional request body overrides (e.g., custom reason text)
 * @returns The created admin request record with pending status
 */
export async function generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallSellerAdminRequest.ICreate>;
  },
): Promise<IEcommerceMallSellerAdminRequest> {
  const prepared: IEcommerceMallSellerAdminRequest.ICreate =
    prepare_random_ecommerce_mall_seller_admin_request(props.body);
  const result: IEcommerceMallSellerAdminRequest =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
