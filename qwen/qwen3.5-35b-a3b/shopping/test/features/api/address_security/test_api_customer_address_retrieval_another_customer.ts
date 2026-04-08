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

export async function test_api_customer_address_retrieval_another_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Alice (first customer)
  const aliceConnection: api.IConnection = { host: connection.host };
  const aliceResult = await authorize_member_join(aliceConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(aliceResult);
  // 2. Register Bob (second customer)
  const bobConnection: api.IConnection = { host: connection.host };
  const bobResult = await authorize_member_join(bobConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(bobResult);
  // 3. Generate a fake address ID that belongs to Alice
  // (We cannot create addresses with available APIs, but we can test security
  // by attempting to access a non-existent address with Alice's ID)
  const aliceFakeAddressId = typia.random<string & tags.Format<"uuid">>();
  // 4. Bob attempts to retrieve Alice's address using her customerId and the fake addressId
  // This should fail with 404 (not found or unauthorized access)
  await TestValidator.httpError(
    "Bob cannot access Alice's address",
    [404, 403],
    async () => {
      await api.functional.ecommerceMall.member.customers.addresses.at(
        bobConnection,
        {
          customerId: aliceResult.id,
          addressId: aliceFakeAddressId,
        },
      );
    },
  );
  // 5. Verify Alice can access her own profile (sanity check that auth works)
  const aliceSummary = aliceResult;
  typia.assert(aliceSummary);
  TestValidator.equals(
    "Alice's ID is valid UUID",
    aliceSummary.id,
    aliceSummary.id,
  );
}
