import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful retrieval of a customer's shipping address that exists and belongs to the authenticated member.
 *
 * This test validates the complete flow for retrieving a customer's shipping address using proper authentication and verifying the address belongs to the authenticated customer.
 * It ensures the API returns a complete address entity with all required fields, correct customer ownership, and valid timestamp formats.
 *
 * The test registers a new member account, then retrieves a shipping address using the authenticated session.
 * It verifies proper authorization, complete address data retrieval, and that the customer object matches the authenticated member.
 * Special attention is given to confirming all address fields are present and active (deleted_at is null).
 *
 * 1. Register a new member account with randomized credentials
 * 2. Retrieve a shipping address using the authenticated member session
 * 3. Validate the response contains all required address fields
 * 4. Verify customer ownership matches the authenticated member
 * 5. Confirm address is active (deleted_at is null)
 * 6. Validate timestamp formats and boolean field types
 */
export async function test_api_customer_address_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IEcommerceMallMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: typia.random<IEcommerceMallMember.IJoin>(),
    },
  );
  typia.assert(member);
  // Create customer-specific connection with auth token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: member.token.access,
  };
  // Step 2: Retrieve a shipping address using the member's ID
  const customerId = member.id;
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const address: IEcommerceMallCustomerAddress =
    await api.functional.ecommerceMall.member.customers.addresses.at(
      customerConnection,
      {
        customerId,
        addressId,
      },
    );
  typia.assert(address);
  // Step 3: Validate response contains all required address fields
  TestValidator.equals("address id matches request", address.id, addressId);
  TestValidator.notEquals(
    "recipient name is not empty",
    address.recipient_name,
    "",
  );
  TestValidator.notEquals("phone is not empty", address.phone, "");
  TestValidator.notEquals("street is not empty", address.street, "");
  TestValidator.notEquals("city is not empty", address.city, "");
  TestValidator.notEquals("state is not empty", address.state, "");
  TestValidator.notEquals("postal code is not empty", address.postal_code, "");
  TestValidator.notEquals("country is not empty", address.country, "");
  // Step 4: Validate boolean and timestamp fields
  TestValidator.equals(
    "is_default is boolean",
    typeof address.is_default,
    "boolean",
  );
  TestValidator.notEquals("created_at is not empty", address.created_at, "");
  TestValidator.notEquals("updated_at is not empty", address.updated_at, "");
  TestValidator.equals(
    "deleted_at is null for active address",
    address.deleted_at,
    null,
  );
  // Step 5: Validate customer ownership
  TestValidator.equals(
    "customer id matches authenticated member",
    address.customer.id,
    customerId,
  );
  TestValidator.equals(
    "customer email matches",
    address.customer.email,
    member.email,
  );
}
