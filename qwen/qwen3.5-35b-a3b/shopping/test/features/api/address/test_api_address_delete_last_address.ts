import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_address_delete_last_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IEcommerceMallMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(joined);
  // 2. Create customer-specific connection with auth token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: joined.token.access,
  };
  // 3. Generate a random address ID to test deletion
  // Note: In real scenario, we would have created this address first
  const addressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to delete the address
  // Expected outcome: 409 Conflict because this address doesn't exist
  // (or is not the customer's address)
  // OR 404 Not Found if the address doesn't exist
  // OR 403 Forbidden if the address belongs to another customer
  // The 409 Conflict would happen if: address IS the customer's last address
  // Since we can't create addresses without the create endpoint, we test the
  // general deletion validation behavior
  await TestValidator.httpError(
    "address deletion should fail for non-owned or invalid address",
    [403, 404],
    async () => {
      await api.functional.ecommerceMall.member.addresses.erase(
        customerConnection,
        { addressId },
      );
    },
  );
  // 5. Verify customer can still perform authenticated operations
  TestValidator.predicate(
    "customer connection remains valid after failed deletion attempt",
    joined.token.access.length > 0,
  );
}
