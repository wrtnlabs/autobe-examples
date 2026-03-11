import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sessions_cannot_view_others(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A account with known password
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Create Seller B account with known password
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 3. Seller A attempts to retrieve their sessions using their authentication token
  const sellerALookupConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerALookupConnection, {
    body: {
      email: sellerA.email,
      password: sellerAPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const sellerASessionsResponse =
    await api.functional.ecommerceMall.seller.sessions.index(
      sellerALookupConnection,
      {
        body: {} satisfies IEcommerceMallSellerSession.IRequest,
      },
    );
  typia.assert(sellerASessionsResponse);
  // 4. Seller B attempts to retrieve their sessions using their authentication token
  const sellerBLookupConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBLookupConnection, {
    body: {
      email: sellerB.email,
      password: sellerBPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const sellerBSessionsResponse =
    await api.functional.ecommerceMall.seller.sessions.index(
      sellerBLookupConnection,
      {
        body: {} satisfies IEcommerceMallSellerSession.IRequest,
      },
    );
  typia.assert(sellerBSessionsResponse);
  // 5. Validate that Seller A cannot see Seller B's sessions
  const sellerAEmails = sellerASessionsResponse.data.map(
    (session) => session.seller.email,
  );
  const hasSellerBEmail = sellerAEmails.includes(sellerB.email);
  TestValidator.equals(
    "Seller A sessions should not contain Seller B's email",
    hasSellerBEmail,
    false,
  );
  // 6. Validate that Seller B cannot see Seller A's sessions
  const sellerBEmails = sellerBSessionsResponse.data.map(
    (session) => session.seller.email,
  );
  const hasSellerAEmail = sellerBEmails.includes(sellerA.email);
  TestValidator.equals(
    "Seller B sessions should not contain Seller A's email",
    hasSellerAEmail,
    false,
  );
}
