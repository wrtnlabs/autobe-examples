import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_sessions_list_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin and get authenticated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a new seller (creates first session)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoined = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoined);
  const sellerId = sellerJoined.id;
  // 3. Log the seller in again (creates second session)
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerLoggedIn = await authorize_seller_login(sellerConnection2, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoggedIn);
  // 4. As super admin, retrieve the seller's sessions with default pagination
  const result =
    await api.functional.shoppingMall.superAdmin.sellers.sessions.index(
      superAdminConnection,
      {
        sellerId: sellerId,
        body: {} satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(result);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination.records >= 2",
    result.pagination.records >= 2,
  );
  TestValidator.equals(
    "pagination.current equals 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals 20",
    result.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination.pages >= 1",
    result.pagination.pages >= 1,
  );
  TestValidator.predicate("data array has items", result.data.length >= 2);
}
