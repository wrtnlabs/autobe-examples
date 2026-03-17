import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_profile_snapshot_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_super_administrator_join(superAdministratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  const request = {} satisfies IShoppingMallSellerProfileSnapshot.IRequest;
  await api.functional.shoppingMall.superAdministrator.seller_profiles.snapshots
    .index(superAdministratorConnection, {
      sellerProfileId,
      body: request,
    })
    .then((page) => {
      typia.assert(page);
      TestValidator.predicate(
        "pagination current is non-negative",
        page.pagination.current >= 0,
      );
      TestValidator.predicate(
        "pagination limit is non-negative",
        page.pagination.limit >= 0,
      );
      TestValidator.predicate(
        "pagination records is non-negative",
        page.pagination.records >= 0,
      );
      TestValidator.predicate(
        "pagination pages is non-negative",
        page.pagination.pages >= 0,
      );
      TestValidator.predicate(
        "page data length does not exceed pagination limit when limited",
        page.pagination.limit === 0 ||
          page.data.length <= page.pagination.limit,
      );
      TestValidator.predicate(
        "pagination pages are coherent with records and limit",
        page.pagination.limit === 0 ||
          page.pagination.pages ===
            Math.ceil(page.pagination.records / page.pagination.limit),
      );
      const snapshotIds = page.data.map((snapshot) => snapshot.id);
      TestValidator.equals(
        "snapshot entries are unique within page",
        new Set(snapshotIds).size,
        snapshotIds.length,
      );
      for (let i = 0; i < page.data.length; ++i) {
        const snapshot = page.data[i];
        TestValidator.equals(
          "snapshot belongs to requested seller profile",
          snapshot.sellerProfile.id,
          sellerProfileId,
        );
        TestValidator.equals(
          "immutable snapshot updated_at equals created_at",
          snapshot.updated_at,
          snapshot.created_at,
        );
        if (i > 0) {
          const previous = page.data[i - 1];
          TestValidator.predicate(
            "snapshot history is ordered by changed_at descending",
            new Date(previous.changed_at).getTime() >=
              new Date(snapshot.changed_at).getTime(),
          );
        }
      }
    })
    .catch(async () => {
      await TestValidator.httpError(
        "random seller profile may be inaccessible or absent without setup APIs",
        [403, 404],
        async () => {
          await api.functional.shoppingMall.superAdministrator.seller_profiles.snapshots.index(
            superAdministratorConnection,
            {
              sellerProfileId,
              body: request,
            },
          );
        },
      );
    });
}
