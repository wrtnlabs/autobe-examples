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

export async function test_api_wishlist_entry_reject_other_customer_removal(
  connection: api.IConnection,
): Promise<void> {
  const actingCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const actingCustomer = await authorize_customer_join(
    actingCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(actingCustomer);
  const ownerCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const ownerCustomer = await authorize_customer_join(ownerCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerCustomer);
  TestValidator.notEquals(
    "different customers must be created",
    actingCustomer.id,
    ownerCustomer.id,
  );
  TestValidator.notEquals(
    "different access tokens must be issued",
    actingCustomer.token.access,
    ownerCustomer.token.access,
  );
  await TestValidator.httpError(
    "customer cannot delete another customer's wishlist entry",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.wishlistEntries.erase(
        actingCustomerConnection,
        {
          wishlistEntryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
