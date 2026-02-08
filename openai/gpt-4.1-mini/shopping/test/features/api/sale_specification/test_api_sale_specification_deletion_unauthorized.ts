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

export async function test_api_sale_specification_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to delete a sale specification without authentication
  const anonymousConnection: api.IConnection = { host: connection.host };
  const specId = typia.random<string & tags.Format<"uuid">>();
  // Expect an HTTP 403 Forbidden or unauthorized error
  await TestValidator.httpError(
    "unauthorized deletion attempt returns 403",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sale_specifications.erase(
        anonymousConnection,
        {
          specId,
        },
      );
    },
  );
}
