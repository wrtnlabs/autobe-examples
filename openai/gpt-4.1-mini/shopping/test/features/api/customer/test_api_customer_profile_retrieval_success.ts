import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and gets authorized
  const customerConnection: api.IConnection = { host: connection.host };
  const joinedEmail = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: joinedEmail,
      password: "Password123!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // Inject authorization header into customerConnection
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Successfully GET /shoppingMall/customer/profile
  const profile =
    await api.functional.shoppingMall.customer.profile.at(customerConnection);
  typia.assert<any>(profile);
  // 3. Verify profile fields: id, email, displayName, phoneNumber
  TestValidator.predicate(
    "profile has id",
    typeof (profile as any).id === "string" && (profile as any).id.length > 0,
  );
  TestValidator.predicate(
    "profile has email",
    typeof (profile as any).email === "string" && (profile as any).email.length > 0,
  );
  TestValidator.predicate(
    "profile has displayName",
    typeof (profile as any).displayName === "string",
  );
  TestValidator.predicate(
    "profile has phoneNumber",
    typeof (profile as any).phoneNumber === "string" || (profile as any).phoneNumber === null,
  );
  TestValidator.equals("email matches joined", (profile as any).email, joinedEmail);
  // 4. Unauthenticated request should fail
  await TestValidator.httpError(
    "unauthenticated access fails",
    401,
    async () => {
      await api.functional.shoppingMall.customer.profile.at({
        host: connection.host,
      });
    },
  );
}
