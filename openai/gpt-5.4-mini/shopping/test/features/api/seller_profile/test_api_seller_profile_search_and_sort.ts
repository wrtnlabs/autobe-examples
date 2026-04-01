import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_seller_profile_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const baseRequest = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformSellerProfile.IRequest;
  const firstPage =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      {
        body: baseRequest,
      },
    );
  typia.assert(firstPage);
  const repeatPage =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      {
        body: baseRequest,
      },
    );
  typia.assert(repeatPage);
  TestValidator.equals(
    "pagination should remain stable",
    firstPage.pagination,
    repeatPage.pagination,
  );
  TestValidator.equals(
    "page data should remain stable",
    firstPage.data,
    repeatPage.data,
  );
  const searchSource = firstPage.data[0] ?? repeatPage.data[0] ?? null;
  const searchTerm =
    searchSource !== null
      ? RandomGenerator.substring(
          `${searchSource.shopName} ${searchSource.shopDescription}`,
        )
      : RandomGenerator.alphabets(3);
  const searched =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      {
        body: {
          ...baseRequest,
          search: searchTerm,
        } satisfies IMallPlatformSellerProfile.IRequest,
      },
    );
  typia.assert(searched);
  TestValidator.predicate(
    "search results should match shop name or description filter",
    searched.data.every(
      (seller) =>
        seller.shopName.includes(searchTerm) ||
        seller.shopDescription.includes(searchTerm),
    ),
  );
  const newestRequest = {
    ...baseRequest,
    sort: "newest",
  } satisfies IMallPlatformSellerProfile.IRequest;
  const newest =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      { body: newestRequest },
    );
  typia.assert(newest);
  const newestRepeat =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      { body: newestRequest },
    );
  typia.assert(newestRepeat);
  TestValidator.equals(
    "newest pagination should remain stable",
    newest.pagination,
    newestRepeat.pagination,
  );
  TestValidator.equals(
    "newest data should remain stable",
    newest.data,
    newestRepeat.data,
  );
  TestValidator.predicate(
    "newest order should be descending by createdAt",
    newest.data.every(
      (seller, index, array) =>
        index === 0 || array[index - 1].createdAt >= seller.createdAt,
    ),
  );
  const oldestRequest = {
    ...baseRequest,
    sort: "oldest",
  } satisfies IMallPlatformSellerProfile.IRequest;
  const oldest =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      { body: oldestRequest },
    );
  typia.assert(oldest);
  const oldestRepeat =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      { body: oldestRequest },
    );
  typia.assert(oldestRepeat);
  TestValidator.equals(
    "oldest pagination should remain stable",
    oldest.pagination,
    oldestRepeat.pagination,
  );
  TestValidator.equals(
    "oldest data should remain stable",
    oldest.data,
    oldestRepeat.data,
  );
  TestValidator.predicate(
    "oldest order should be ascending by createdAt",
    oldest.data.every(
      (seller, index, array) =>
        index === 0 || array[index - 1].createdAt <= seller.createdAt,
    ),
  );
  const shopNameAscRequest = {
    ...baseRequest,
    sort: "shopName_asc",
  } satisfies IMallPlatformSellerProfile.IRequest;
  const shopNameAsc =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      { body: shopNameAscRequest },
    );
  typia.assert(shopNameAsc);
  const shopNameAscRepeat =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      { body: shopNameAscRequest },
    );
  typia.assert(shopNameAscRepeat);
  TestValidator.equals(
    "shopName asc pagination should remain stable",
    shopNameAsc.pagination,
    shopNameAscRepeat.pagination,
  );
  TestValidator.equals(
    "shopName asc data should remain stable",
    shopNameAsc.data,
    shopNameAscRepeat.data,
  );
  TestValidator.predicate(
    "shop name ascending order",
    shopNameAsc.data.every(
      (seller, index, array) =>
        index === 0 || array[index - 1].shopName <= seller.shopName,
    ),
  );
  const shopNameDescRequest = {
    ...baseRequest,
    sort: "shopName_desc",
  } satisfies IMallPlatformSellerProfile.IRequest;
  const shopNameDesc =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      { body: shopNameDescRequest },
    );
  typia.assert(shopNameDesc);
  const shopNameDescRepeat =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      { body: shopNameDescRequest },
    );
  typia.assert(shopNameDescRepeat);
  TestValidator.equals(
    "shopName desc pagination should remain stable",
    shopNameDesc.pagination,
    shopNameDescRepeat.pagination,
  );
  TestValidator.equals(
    "shopName desc data should remain stable",
    shopNameDesc.data,
    shopNameDescRepeat.data,
  );
  TestValidator.predicate(
    "shop name descending order",
    shopNameDesc.data.every(
      (seller, index, array) =>
        index === 0 || array[index - 1].shopName >= seller.shopName,
    ),
  );
}
