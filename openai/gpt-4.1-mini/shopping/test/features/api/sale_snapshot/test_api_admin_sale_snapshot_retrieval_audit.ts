import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_sale_snapshot_retrieval_audit(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Admin registration
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  typia.assert(adminAuthorized);
  // Reuse the token from join to authorize subsequent admin API calls
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Seller registration and login
  const sellerJoinInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "seller_password_123",
    shopName: "Test Shop",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInfo,
  });
  typia.assert(sellerAuthorized);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinInfo.email,
      password: sellerJoinInfo.password,
    },
  });
  // 3. Use random UUIDs for saleId and snapshotId
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Admin retrieves sale snapshot
  const snapshot = await api.functional.shoppingMall.seller.sales.snapshots.at(
    adminConnection,
    { saleId, snapshotId },
  );
  typia.assert(snapshot);
  // 5. Validate snapshot immutability and presence of key properties
  TestValidator.predicate("snapshot is immutable and read-only", () => {
    const props = [
      "id",
      "shoppingMallSaleId",
      "title",
      "description",
      "categoryId",
      "basePrice",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ];
    return props.every((prop) => prop in snapshot);
  });
  // 6. Validate snapshot fields formats and values
  TestValidator.predicate(
    "snapshot id format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  TestValidator.equals(
    "snapshot sale id matches",
    snapshot.shoppingMallSaleId,
    saleId,
  );
  TestValidator.predicate("base price non-negative", snapshot.basePrice >= 0);
  TestValidator.predicate(
    "createdAt is ISO date-time",
    typeof snapshot.createdAt === "string" &&
      !isNaN(Date.parse(snapshot.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    typeof snapshot.updatedAt === "string" &&
      !isNaN(Date.parse(snapshot.updatedAt)),
  );
  if (snapshot.deletedAt !== null) {
    TestValidator.predicate(
      "deletedAt is ISO date-time or null",
      typeof snapshot.deletedAt === "string" &&
        !isNaN(Date.parse(snapshot.deletedAt)),
    );
  } else {
    TestValidator.equals("deletedAt is null", snapshot.deletedAt, null);
  }
}
