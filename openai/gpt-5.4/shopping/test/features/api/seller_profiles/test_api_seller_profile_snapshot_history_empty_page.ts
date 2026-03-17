import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
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

export async function test_api_seller_profile_snapshot_history_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {},
  );
  typia.assert(administrator);
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const request = {
    page: 1,
    limit: 10,
    sortBy: "changed_at",
    sortOrder: "desc",
  } satisfies IShoppingMallSellerProfileSnapshot.IRequest;
  const result:
    | IPageIShoppingMallSellerProfileSnapshot.ISummary
    | api.HttpError =
    await api.functional.shoppingMall.administrator.seller_profiles.snapshots
      .index(administratorConnection, {
        sellerProfileId: seller.id,
        body: request,
      })
      .catch((exp: unknown) => {
        if (exp instanceof api.HttpError) return exp;
        throw exp;
      });
  if (result instanceof api.HttpError) {
    await TestValidator.httpError(
      "missing seller profile is handled normally",
      [404, 422],
      async () => {
        await api.functional.shoppingMall.administrator.seller_profiles.snapshots.index(
          administratorConnection,
          {
            sellerProfileId: seller.id,
            body: request,
          },
        );
      },
    );
    return;
  }
  typia.assert(result);
  TestValidator.equals(
    "requested page is preserved",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit is preserved",
    result.pagination.limit,
    10,
  );
  TestValidator.equals("no snapshot rows exist yet", result.data.length, 0);
  TestValidator.equals(
    "total record count is zero",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages is zero when records is zero",
    result.pagination.pages,
    0,
  );
}
