import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_account_oversight_detail_access(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  const seller = await api.functional.shoppingMall.sellers.at(
    sellerConnection,
    {
      sellerId: joined.id,
    },
  );
  typia.assert(seller);
  TestValidator.equals(
    "seller id matches requested seller",
    seller.id,
    joined.id,
  );
  TestValidator.equals(
    "seller email matches joined seller",
    seller.email,
    joined.email,
  );
  TestValidator.equals(
    "approval status matches joined seller",
    seller.approval_status,
    joined.approval_status,
  );
  TestValidator.equals(
    "rejection reason matches joined seller",
    seller.rejection_reason,
    joined.rejection_reason,
  );
  TestValidator.equals(
    "suspended flag matches joined seller",
    seller.suspended,
    joined.suspended,
  );
  TestValidator.equals(
    "banned flag matches joined seller",
    seller.banned,
    joined.banned,
  );
  TestValidator.equals(
    "created timestamp matches joined seller",
    seller.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "updated timestamp matches joined seller",
    seller.updated_at,
    joined.updated_at,
  );
  TestValidator.equals(
    "deleted timestamp matches joined seller",
    seller.deleted_at,
    joined.deleted_at,
  );
}
