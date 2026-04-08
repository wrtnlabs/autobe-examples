import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: `${connection.host}/seller/join`,
      referrer: `${connection.host}/`,
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Step 2: Query profile snapshots using the authenticated connection
  const snapshots =
    await api.functional.ecommerceMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAfter: null,
          createdBefore: null,
          page: null,
          limit: null,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  // Step 3: Validate complete response structure including pagination and snapshot data
  typia.assert(snapshots);
}
