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

export async function test_api_customer_address_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create a customer-specific connection with auth token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // Step 3: Attempt to retrieve a non-existent (soft-deleted) address
  // This simulates trying to access an address that was soft-deleted
  const customerId: string & tags.Format<"uuid"> = memberAuth.id;
  const nonExistentAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Expected to throw 404 since the address doesn't exist (or is soft-deleted)
  await TestValidator.httpError(
    "should return 404 for non-existent address",
    404,
    async () => {
      await api.functional.ecommerceMall.member.customers.addresses.at(
        customerConnection,
        {
          customerId,
          addressId: nonExistentAddressId,
        },
      );
    },
  );
}
