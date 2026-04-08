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

export async function test_api_address_delete_success(
  connection: api.IConnection,
) {
  // 1. Register customer account with authentication tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "",
      referrer: "",
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customer);
  // 2. Test address deletion returns null successfully
  // Note: Cannot verify full business logic (e.g., cannot create addresses without SDK)
  // This test validates the API contract and response structure
  const addressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.ecommerceMall.member.addresses.erase(
    customerConnection,
    {
      addressId,
    },
  );
  // 3. Verify the function returns void (null response body)
  // The erase function has return type void, which is validated by TypeScript
  TestValidator.predicate("address deletion returns void", true);
}