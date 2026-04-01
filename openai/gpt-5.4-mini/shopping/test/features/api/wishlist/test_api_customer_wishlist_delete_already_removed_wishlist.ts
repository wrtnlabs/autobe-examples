import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_delete_already_removed_wishlist(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const wishlistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleting an already removed wishlist should return not found",
    [404],
    async () => {
      await api.functional.mallPlatform.customer.wishlists.erase(
        customerConnection,
        {
          wishlistId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "repeating deletion on the same removed wishlist should still return not found",
    [404],
    async () => {
      await api.functional.mallPlatform.customer.wishlists.erase(
        customerConnection,
        {
          wishlistId,
        },
      );
    },
  );
}
