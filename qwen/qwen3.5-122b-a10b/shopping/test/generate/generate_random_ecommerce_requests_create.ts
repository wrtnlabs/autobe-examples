import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_admin_request } from "../prepare/prepare_random_ecommerce_admin_request";

/**
 * Generate a random e-commerce administrator request via the API for E2E testing.
 *
 * Prepares random administrator request data using the prepare function, then calls the creation endpoint to submit the request.
 *
 * This function creates an administrator access request with a randomized reason field. The requester identity (customer or seller) is automatically determined from the authenticated user's session when the API is called.
 *
 * The created request will have 'pending' status and will be queued for review by super administrators.
 *
 * @param connection - The connection information for the API server
 * @param props - Optional properties for customization
 * @param props.body - Optional partial input to override auto-generated values
 * @returns The created administrator request with pending status
 */
export async function generate_random_ecommerce_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceAdminRequest.ICreate> | undefined;
  },
): Promise<IEcommerceAdminRequest> {
  const prepared: IEcommerceAdminRequest.ICreate =
    prepare_random_ecommerce_admin_request(props.body);
  const result: IEcommerceAdminRequest =
    await api.functional.ecommerce.requests.create(connection, {
      body: prepared,
    });
  return result;
}
