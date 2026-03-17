import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_wishlist_entry_other_customer_hidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomer = await authorize_customer_join(otherCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(otherCustomer);
  TestValidator.notEquals("distinct customer ids", owner.id, otherCustomer.id);
  TestValidator.notEquals(
    "distinct customer emails",
    owner.email,
    otherCustomer.email,
  );
  const hiddenWishlistEntryId = typia.random<string & tags.Format<"uuid">>();
  let error: api.HttpError | null = null;
  try {
    await api.functional.shoppingMall.customer.wishlistEntries.at(
      otherCustomerConnection,
      {
        wishlistEntryId: hiddenWishlistEntryId,
      },
    );
  } catch (exp) {
    if (exp instanceof api.HttpError) error = exp;
    else throw exp;
  }
  TestValidator.predicate("other customer retrieval is denied", error !== null);
  const safeError = typia.assert<api.HttpError>(error);
  TestValidator.equals("denial uses not-found style status", safeError.status, 404);
  const message = JSON.stringify(safeError.toJSON().message);
  TestValidator.predicate(
    "denial does not disclose owner id or email",
    !message.includes(owner.id) && !message.includes(owner.email),
  );
}
