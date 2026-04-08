import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_list_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const firstPage =
    await api.functional.mallPlatform.seller.sellerProfileSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "snapshot history should be returned as the first page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "snapshot history page limit should be positive",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "snapshot history records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot history pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  for (const snapshot of firstPage.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot should include a seller profile summary",
      snapshot.sellerProfile !== null,
    );
    TestValidator.predicate(
      "snapshot shop name should be non-empty",
      snapshot.shopName.length > 0,
    );
    TestValidator.predicate(
      "snapshot shop description should be non-empty",
      snapshot.shopDescription.length > 0,
    );
    if (snapshot.logoImageUri !== null) {
      TestValidator.predicate(
        "snapshot logo image URI should be a non-empty string when present",
        snapshot.logoImageUri.length > 0,
      );
    }
  }
  const secondPage =
    await api.functional.mallPlatform.seller.sellerProfileSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "small page should still target the first page",
    secondPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "small page should use the requested limit",
    secondPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "small page should not return more than one snapshot",
    secondPage.data.length <= 1,
  );
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.equals(
      "newest-first default ordering should keep the first snapshot stable for the same query scope",
      secondPage.data[0].id,
      firstPage.data[0].id,
    );
  }
}
