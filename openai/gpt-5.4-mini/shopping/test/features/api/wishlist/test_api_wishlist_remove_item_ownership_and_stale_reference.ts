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

export async function test_api_wishlist_remove_item_ownership_and_stale_reference(
  connection: api.IConnection,
): Promise<void> {
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const wishlistId = typia.random<string & tags.Format<"uuid">>();
  const wishlistItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "reject cross-customer wishlist item deletion",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.wishlists.items.erase(
        customerBConnection,
        {
          wishlistId,
          wishlistItemId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "reject deleting an arbitrary wishlist item without a valid owned wishlist scope",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.wishlists.items.erase(
        customerAConnection,
        {
          wishlistId,
          wishlistItemId,
        },
      );
    },
  );
}
