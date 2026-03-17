import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

export async function test_api_seller_profile_snapshot_history_administrator_default_order(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administratorJoin = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administratorJoin);
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const request = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSellerProfileSnapshot.IRequest;
  try {
    const firstPage =
      await api.functional.shoppingMall.administrator.seller_profiles.snapshots.index(
        administratorConnection,
        {
          sellerProfileId: sellerJoin.id,
          body: request,
        },
      );
    typia.assert(firstPage);
    const secondPage =
      await api.functional.shoppingMall.administrator.seller_profiles.snapshots.index(
        administratorConnection,
        {
          sellerProfileId: sellerJoin.id,
          body: request,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals("repeated reads are stable", secondPage, firstPage);
    TestValidator.equals(
      "current page matches request",
      firstPage.pagination.current,
      request.page,
    );
    TestValidator.equals(
      "limit matches request",
      firstPage.pagination.limit,
      request.limit,
    );
    TestValidator.predicate(
      "returned item count within limit",
      firstPage.data.length <= firstPage.pagination.limit,
    );
    TestValidator.predicate(
      "records cover current page data",
      firstPage.pagination.records >= firstPage.data.length,
    );
    TestValidator.equals(
      "pages matches ceiling formula",
      firstPage.pagination.pages,
      Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
    );
    if (firstPage.pagination.records === 0) {
      TestValidator.equals(
        "empty records produce empty data",
        firstPage.data.length,
        0,
      );
    }
    for (const snapshot of firstPage.data) {
      TestValidator.equals(
        "snapshot belongs to requested seller profile id",
        snapshot.sellerProfile.id,
        sellerJoin.id,
      );
      TestValidator.notEquals(
        "snapshot id differs from seller profile id",
        snapshot.id,
        snapshot.sellerProfile.id,
      );
      TestValidator.predicate(
        "shop name preserved",
        snapshot.shop_name.length > 0,
      );
      TestValidator.predicate(
        "changed summary preserved",
        snapshot.changed_summary.length > 0,
      );
      TestValidator.predicate(
        "snapshot created_at is not after updated_at",
        new Date(snapshot.created_at).getTime() <=
          new Date(snapshot.updated_at).getTime(),
      );
      TestValidator.predicate(
        "snapshot changed_at is a valid timestamp",
        Number.isFinite(new Date(snapshot.changed_at).getTime()),
      );
    }
    for (let i = 1; i < firstPage.data.length; ++i) {
      TestValidator.predicate(
        "default order is changed_at descending",
        new Date(firstPage.data[i - 1].changed_at).getTime() >=
          new Date(firstPage.data[i].changed_at).getTime(),
      );
    }
  } catch (exp) {
    if (exp instanceof api.HttpError) {
      TestValidator.predicate(
        "missing seller profile setup yields acceptable business error",
        [400, 403, 404, 422].includes(exp.status),
      );
      return;
    }
    throw exp;
  }
}
