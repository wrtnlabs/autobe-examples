import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_update_rejects_unsupported_change_scope(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const historyRequest = {
    page: 1,
    limit: 100,
    sortBy: "changed_at",
    sortOrder: "desc",
  } satisfies IShoppingMallSellerProfileSnapshot.IRequest;
  const snapshotsBefore =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: historyRequest,
      },
    );
  typia.assert(snapshotsBefore);
  const validBody = {
    displayName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  const unsupportedBody = {
    ...validBody,
    approval_status: RandomGenerator.pick([
      "approved",
      "pending",
      "rejected",
    ] as const),
  };
  await TestValidator.error(
    "seller profile update rejects unsupported change scope",
    async () => {
      await api.functional.shoppingMall.seller.profile.update(
        sellerConnection,
        {
          body: unsupportedBody,
        },
      );
    },
  );
  const snapshotsAfter =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: historyRequest,
      },
    );
  typia.assert(snapshotsAfter);
  TestValidator.equals(
    "snapshot record count unchanged",
    snapshotsAfter.pagination.records,
    snapshotsBefore.pagination.records,
  );
  TestValidator.equals(
    "snapshot page count unchanged",
    snapshotsAfter.pagination.pages,
    snapshotsBefore.pagination.pages,
  );
  TestValidator.equals(
    "snapshot current page unchanged",
    snapshotsAfter.pagination.current,
    snapshotsBefore.pagination.current,
  );
  TestValidator.equals(
    "snapshot page limit unchanged",
    snapshotsAfter.pagination.limit,
    snapshotsBefore.pagination.limit,
  );
  TestValidator.equals(
    "snapshot data length unchanged",
    snapshotsAfter.data.length,
    snapshotsBefore.data.length,
  );
  TestValidator.equals(
    "snapshot list unchanged after rejected update",
    snapshotsAfter.data,
    snapshotsBefore.data,
  );
  const beforeIds = snapshotsBefore.data.map((snapshot) => snapshot.id);
  const afterIds = snapshotsAfter.data.map((snapshot) => snapshot.id);
  TestValidator.equals(
    "snapshot ids remain in same order",
    afterIds,
    beforeIds,
  );
}
