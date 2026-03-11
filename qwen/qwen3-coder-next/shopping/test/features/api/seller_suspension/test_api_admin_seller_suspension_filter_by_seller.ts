import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_suspension_filter_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Create a new connection with admin token
  const newAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: admin.token.access,
    },
  };
  // 2. Filter by seller_id (non-existent seller) - should return empty result
  const emptyResult =
    await api.functional.ecommerceMall.admin.seller_suspensions.index(
      newAdminConnection,
      {
        body: {
          seller_id: "00000000-0000-0000-0000-000000000000" satisfies string &
            tags.Format<"uuid">,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result for non-existent seller",
    emptyResult.data.length,
    0,
  );
  // 3. Filter by seller_id (existent seller with suspensions)
  const result =
    await api.functional.ecommerceMall.admin.seller_suspensions.index(
      newAdminConnection,
      {
        body: {
          seller_id: "11111111-1111-1111-1111-111111111111" satisfies string &
            tags.Format<"uuid">,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(result);
  // Verify pagination structure
  TestValidator.predicate("has pagination", result.pagination.current >= 0);
  TestValidator.predicate(
    "has valid records count",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    result.pagination.limit >= 0 && result.pagination.limit <= 100,
  );
  // Verify data structure for each suspension
  for (const suspension of result.data) {
    TestValidator.equals("has valid id", typeof suspension.id, "string");
    TestValidator.equals(
      "has valid seller id",
      typeof suspension.seller.id,
      "string",
    );
    TestValidator.equals(
      "has valid seller shop_name",
      typeof suspension.seller.shop_name,
      "string",
    );
    TestValidator.equals(
      "has valid admin id",
      typeof suspension.admin.id,
      "string",
    );
    TestValidator.equals(
      "has valid created_at",
      typeof suspension.created_at,
      "string",
    );
    TestValidator.equals(
      "has valid updated_at",
      typeof suspension.updated_at,
      "string",
    );
  }
}
