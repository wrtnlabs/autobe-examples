import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export async function test_api_seller_profile_snapshots_search_preserved_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email:
        `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies IMallPlatformSeller.IJoin["email"],
      password:
        `${RandomGenerator.alphaNumeric(12)}Aa!` satisfies IMallPlatformSeller.IJoin["password"],
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const response =
    await api.functional.mallPlatform.seller.seller_profiles.snapshots.index(
      sellerConnection,
      {
        sellerProfileId: authorized.id,
        body: {
          page: 1,
          limit: 10,
          sort: "-createdAt",
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "snapshot page should report the requested page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshot page should report the requested limit",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "snapshot page record count should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot page total pages should be non-negative",
    response.pagination.pages >= 0,
  );
  for (const snapshot of response.data) {
    TestValidator.equals(
      "snapshot should belong to the authenticated seller profile",
      snapshot.sellerProfileId,
      authorized.id,
    );
    TestValidator.predicate(
      "snapshot shop name should be a non-empty historical value",
      snapshot.shopName.length > 0,
    );
    TestValidator.predicate(
      "snapshot shop description should be a non-empty historical value",
      snapshot.shopDescription.length > 0,
    );
    if (snapshot.logoImageUri !== null) {
      TestValidator.predicate(
        "snapshot logo image URI should not be empty when present",
        snapshot.logoImageUri.length > 0,
      );
    }
    TestValidator.predicate(
      "snapshot timestamp should exist",
      snapshot.createdAt.length > 0,
    );
  }
}
