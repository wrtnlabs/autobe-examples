import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_details_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate random UUID that doesn't correspond to any existing seller
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify that requesting non-existent seller returns HTTP 404 error
  await TestValidator.httpError(
    "non-existent seller returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.sellers.at(adminConnection, {
        sellerId: nonExistentSellerId,
      });
    },
  );
}
