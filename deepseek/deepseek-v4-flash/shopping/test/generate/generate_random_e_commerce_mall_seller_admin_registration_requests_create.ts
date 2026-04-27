import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../prepare/prepare_random_ecommerce_mall_admin_registration_request";

/**
 * Generate a random administrator registration request via the API for E2E testing.
 *
 * Prepares random admin registration request data using the prepare function,
 * then calls the creation endpoint to submit the request. The generated request
 * will be in "pending" status and will be associated with the currently
 * authenticated actor (customer or seller).
 *
 * @param connection - The API connection configuration
 * @param props.body - Optional partial input to override default generated values
 * @returns The created administrator registration request record
 */
export async function generate_random_e_commerce_mall_seller_admin_registration_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallAdminRegistrationRequest.ICreate> | undefined;
  }
): Promise<IECommerceMallAdminRegistrationRequest> {
  const prepared: IECommerceMallAdminRegistrationRequest.ICreate = prepare_random_ecommerce_mall_admin_registration_request(
    props.body
  );
  return await api.functional.eCommerceMall.seller.admin_registration_requests.create(
    connection,
    {
      body: prepared,
    },
  );
}