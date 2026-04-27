import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../prepare/prepare_random_ecommerce_mall_admin_registration_request";

/**
 * Generate a random e-commerce mall admin registration request for E2E testing.
 *
 * Prepares an administrator registration request with a randomized reason
 * text using the prepare function, then submits it via the customer
 * admin-registration-requests creation endpoint to create an actual
 * registration request record.
 *
 * The generated request will have a "pending" status and can be used to test
 * the admin registration workflow including approval and rejection by a
 * super administrator.
 *
 * @param connection API connection configuration
 * @param props.input Optional partial data to override the randomly generated
 *   registration request fields
 * @returns The created admin registration request with full entity details
 */
export async function generate_random_e_commerce_mall_customer_admin_registration_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallAdminRegistrationRequest.ICreate> | undefined;
  }
): Promise<IECommerceMallAdminRegistrationRequest> {
  const prepared: IECommerceMallAdminRegistrationRequest.ICreate = prepare_random_ecommerce_mall_admin_registration_request(
    props.body,
  );
  return await api.functional.eCommerceMall.customer.admin_registration_requests.create(
    connection,
    {
      body: prepared,
    },
  );
};