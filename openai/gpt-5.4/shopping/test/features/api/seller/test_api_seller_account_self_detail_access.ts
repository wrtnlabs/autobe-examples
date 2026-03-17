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

export async function test_api_seller_account_self_detail_access(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const join = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(join);
  const detail = await api.functional.shoppingMall.sellers.at(
    sellerConnection,
    {
      sellerId: join.id,
    },
  );
  typia.assert(detail);
  typia.assertEquals<IShoppingMallSeller>(detail);
  TestValidator.equals("seller id matches self", detail.id, join.id);
  TestValidator.equals("seller email matches self", detail.email, join.email);
  TestValidator.equals(
    "seller approval status matches self",
    detail.approval_status,
    join.approval_status,
  );
  TestValidator.equals(
    "seller rejection reason matches self",
    detail.rejection_reason,
    join.rejection_reason,
  );
  TestValidator.equals(
    "seller suspended flag matches self",
    detail.suspended,
    join.suspended,
  );
  TestValidator.equals(
    "seller banned flag matches self",
    detail.banned,
    join.banned,
  );
  TestValidator.equals(
    "seller created_at matches self",
    detail.created_at,
    join.created_at,
  );
  TestValidator.equals(
    "seller updated_at matches self",
    detail.updated_at,
    join.updated_at,
  );
  TestValidator.equals(
    "seller deleted_at matches self",
    detail.deleted_at,
    join.deleted_at,
  );
}
