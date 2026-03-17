import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_seller_roster_access_denied_for_non_governance_actor(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  const now: Date = new Date();
  const createdAtFrom: string = new Date(
    now.getTime() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const createdAtTo: string = now.toISOString();
  const updatedAtFrom: string = new Date(
    now.getTime() - 1000 * 60 * 60 * 12,
  ).toISOString();
  const updatedAtTo: string = now.toISOString();
  const request = {
    search: RandomGenerator.paragraph({ sentences: 2 }),
    approval_status: RandomGenerator.alphabets(8),
    suspended: false,
    banned: false,
    includeDeleted: false,
    createdAtFrom,
    createdAtTo,
    updatedAtFrom,
    updatedAtTo,
    sort: "-created_at",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSeller.IRequest;
  await TestValidator.httpError(
    "customer cannot browse marketplace-wide seller roster",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.sellers.index(customerConnection, {
        body: request,
      });
    },
  );
}
