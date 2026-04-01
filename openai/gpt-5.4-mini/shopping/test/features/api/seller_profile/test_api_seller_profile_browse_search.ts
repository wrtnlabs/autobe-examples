import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_browse_search(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const firstPage =
    await api.functional.mallPlatform.administrator.sellerProfiles.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IMallPlatformSellerProfile.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page should be first page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should reflect requested limit",
    firstPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data size should not exceed page limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  for (const profile of firstPage.data) {
    typia.assert(profile);
    TestValidator.predicate(
      "seller profile should expose public id",
      profile.id.length > 0,
    );
    TestValidator.predicate(
      "seller profile should expose shop name",
      profile.shopName.length > 0,
    );
    TestValidator.predicate(
      "seller profile should expose shop description",
      profile.shopDescription.length > 0,
    );
    TestValidator.predicate(
      "seller profile should expose owning seller account summary",
      profile.sellerAccount.id.length > 0 &&
        profile.sellerAccount.email.length > 0,
    );
    TestValidator.predicate(
      "seller profile should expose logo uri or null only",
      profile.logoImageUri === null || profile.logoImageUri.length > 0,
    );
  }
  if (firstPage.data.length > 0) {
    const sample = firstPage.data[0];
    const searchTerm =
      RandomGenerator.substring(
        `${sample.shopName} ${sample.shopDescription}`,
      ).trim() || sample.shopName;
    const searchPage =
      await api.functional.mallPlatform.administrator.sellerProfiles.index(
        adminConnection,
        {
          body: {
            search: searchTerm,
            page: 1,
            limit: 5,
          } satisfies IMallPlatformSellerProfile.IRequest,
        },
      );
    typia.assert(searchPage);
    TestValidator.equals(
      "search result pagination should keep first page",
      searchPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "search result limit should match requested limit",
      searchPage.pagination.limit,
      5,
    );
    TestValidator.predicate(
      "search result data should not exceed limit",
      searchPage.data.length <= 5,
    );
    for (const profile of searchPage.data) {
      TestValidator.predicate(
        "search result should match the query in public fields",
        profile.shopName.includes(searchTerm) ||
          profile.shopDescription.includes(searchTerm),
      );
      typia.assert(profile);
    }
  }
}
