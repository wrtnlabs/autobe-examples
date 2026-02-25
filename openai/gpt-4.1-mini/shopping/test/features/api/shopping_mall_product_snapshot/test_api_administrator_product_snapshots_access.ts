import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
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

export async function test_api_administrator_product_snapshots_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a seller to create a product context
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd",
      shopName: RandomGenerator.name(),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      logoUri: null,
    },
  });
  typia.assert(sellerJoin);
  // 2. Seller login
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "StrongP@ssw0rd",
    },
  });
  typia.assert(sellerLogin);
  // 3. Join administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminP@ss1",
    },
  });
  typia.assert(adminJoin);
  // 4. Administrator login
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: "AdminP@ss1",
    },
  });
  typia.assert(adminLogin);
  // 5. Seller needs to create a product to have snapshots.
  // Since product creation utility is not provided, simulate a productId
  // Typically, a real product would be created by seller for snapshot access.
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 6. Admin requests product snapshots for random productId (simulate access any seller product)
  const requestBody: IShoppingMallProductSnapshot.IRequest = {
    search: undefined,
    page: 1,
    limit: 10,
  };
  const snapshots =
    await api.functional.shoppingMall.seller.products.snapshots.indexSnapshots(
      adminConnection,
      {
        productId: productId,
        body: requestBody,
      },
    );
  typia.assert(snapshots);
  // 7. Validate response pagination and list
  TestValidator.predicate(
    "pagination current page is 1",
    snapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    snapshots.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data array is present",
    Array.isArray(snapshots.data),
  );
  // If data array is not empty, verify fields of each snapshot
  if (snapshots.data.length > 0) {
    for (const snapshot of snapshots.data) {
      typia.assert(snapshot);
      TestValidator.predicate(
        "snapshot productId matches",
        snapshot.shoppingMallProductId === productId,
      );
      TestValidator.predicate(
        "snapshot base price is non-negative",
        snapshot.basePrice >= 0,
      );
      TestValidator.predicate(
        "snapshot deletedAt is null or string",
        snapshot.deletedAt === null || typeof snapshot.deletedAt === "string",
      );
      TestValidator.predicate(
        "snapshot createdAt is ISO string",
        typeof snapshot.createdAt === "string",
      );
      TestValidator.predicate(
        "snapshot updatedAt is ISO string",
        typeof snapshot.updatedAt === "string",
      );
    }
  }
}
