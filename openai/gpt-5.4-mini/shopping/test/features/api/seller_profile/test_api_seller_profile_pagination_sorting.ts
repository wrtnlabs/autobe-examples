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

export async function test_api_seller_profile_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  const page1Asc =
    await api.functional.mallPlatform.administrator.sellerProfiles.index(
      adminConnection,
      {
        body: {
          sort: "shopName_asc",
          page: 1,
          limit: 10,
        } satisfies IMallPlatformSellerProfile.IRequest,
      },
    );
  typia.assert(page1Asc);
  const page2Asc =
    await api.functional.mallPlatform.administrator.sellerProfiles.index(
      adminConnection,
      {
        body: {
          sort: "shopName_asc",
          page: 2,
          limit: 10,
        } satisfies IMallPlatformSellerProfile.IRequest,
      },
    );
  typia.assert(page2Asc);
  TestValidator.equals(
    "page 1 limit should match requested limit",
    page1Asc.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2 limit should match requested limit",
    page2Asc.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 current should be 1",
    page1Asc.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 2 current should be 2",
    page2Asc.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 1 pages should be consistent with total records",
    page1Asc.pagination.pages,
    Math.ceil(page1Asc.pagination.records / page1Asc.pagination.limit),
  );
  TestValidator.equals(
    "page 2 pages should be consistent with total records",
    page2Asc.pagination.pages,
    Math.ceil(page2Asc.pagination.records / page2Asc.pagination.limit),
  );
  TestValidator.equals(
    "page 1 and page 2 should report the same record count",
    page1Asc.pagination.records,
    page2Asc.pagination.records,
  );
  TestValidator.equals(
    "page 1 and page 2 should report the same total pages",
    page1Asc.pagination.pages,
    page2Asc.pagination.pages,
  );
  const expectedPage2Count = Math.max(
    0,
    Math.min(10, page1Asc.pagination.records - 10),
  );
  TestValidator.equals(
    "page 2 data length should match expected remaining records",
    page2Asc.data.length,
    expectedPage2Count,
  );
  TestValidator.predicate(
    "page 1 results should not exceed limit",
    page1Asc.data.length <= page1Asc.pagination.limit,
  );
  TestValidator.predicate(
    "page 2 results should not exceed limit",
    page2Asc.data.length <= page2Asc.pagination.limit,
  );
  if (page1Asc.data.length > 1) {
    for (let i = 1; i < page1Asc.data.length; ++i) {
      TestValidator.predicate(
        "shop names should be non-decreasing on page 1 ascending sort",
        page1Asc.data[i - 1].shopName <= page1Asc.data[i].shopName,
      );
    }
  }
  if (page2Asc.data.length > 1) {
    for (let i = 1; i < page2Asc.data.length; ++i) {
      TestValidator.predicate(
        "shop names should be non-decreasing on page 2 ascending sort",
        page2Asc.data[i - 1].shopName <= page2Asc.data[i].shopName,
      );
    }
  }
  if (page1Asc.data.length > 0 && page2Asc.data.length > 0) {
    TestValidator.predicate(
      "page boundaries should be ordered consistently across sequential pages",
      page1Asc.data[page1Asc.data.length - 1].shopName <=
        page2Asc.data[0].shopName,
    );
  }
  const page1Desc =
    await api.functional.mallPlatform.administrator.sellerProfiles.index(
      adminConnection,
      {
        body: {
          sort: "shopName_desc",
          page: 1,
          limit: 10,
        } satisfies IMallPlatformSellerProfile.IRequest,
      },
    );
  typia.assert(page1Desc);
  TestValidator.equals(
    "descending page 1 current should be 1",
    page1Desc.pagination.current,
    1,
  );
  TestValidator.equals(
    "descending page 1 limit should match requested limit",
    page1Desc.pagination.limit,
    10,
  );
  TestValidator.equals(
    "descending page 1 total records should match ascending query",
    page1Desc.pagination.records,
    page1Asc.pagination.records,
  );
  TestValidator.equals(
    "descending page 1 total pages should match ascending query",
    page1Desc.pagination.pages,
    page1Asc.pagination.pages,
  );
  if (page1Desc.data.length > 1) {
    for (let i = 1; i < page1Desc.data.length; ++i) {
      TestValidator.predicate(
        "shop names should be non-increasing on page 1 descending sort",
        page1Desc.data[i - 1].shopName >= page1Desc.data[i].shopName,
      );
    }
  }
  const newestPage1 =
    await api.functional.mallPlatform.administrator.sellerProfiles.index(
      adminConnection,
      {
        body: {
          sort: "newest",
          page: 1,
          limit: 10,
        } satisfies IMallPlatformSellerProfile.IRequest,
      },
    );
  typia.assert(newestPage1);
  const oldestPage1 =
    await api.functional.mallPlatform.administrator.sellerProfiles.index(
      adminConnection,
      {
        body: {
          sort: "oldest",
          page: 1,
          limit: 10,
        } satisfies IMallPlatformSellerProfile.IRequest,
      },
    );
  typia.assert(oldestPage1);
  TestValidator.equals(
    "newest and oldest should report same total records",
    newestPage1.pagination.records,
    oldestPage1.pagination.records,
  );
  TestValidator.equals(
    "newest and oldest should report same total pages",
    newestPage1.pagination.pages,
    oldestPage1.pagination.pages,
  );
  if (newestPage1.data.length > 1) {
    for (let i = 1; i < newestPage1.data.length; ++i) {
      TestValidator.predicate(
        "newest sort should be stable across page order",
        newestPage1.data[i - 1].createdAt >= newestPage1.data[i].createdAt,
      );
    }
  }
  if (oldestPage1.data.length > 1) {
    for (let i = 1; i < oldestPage1.data.length; ++i) {
      TestValidator.predicate(
        "oldest sort should be stable across page order",
        oldestPage1.data[i - 1].createdAt <= oldestPage1.data[i].createdAt,
      );
    }
  }
}
