import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_category_browse_paginated_filtered(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const topLevelFirst =
    await api.functional.mallPlatform.customer.categories.index(
      customerConnection,
      {
        body: {
          parentCategoryId: null,
          page: 1,
          limit: 5,
        } satisfies IMallPlatformCategory.IRequest,
      },
    );
  typia.assert(topLevelFirst);
  const topLevelRepeat =
    await api.functional.mallPlatform.customer.categories.index(
      customerConnection,
      {
        body: {
          parentCategoryId: null,
          page: 1,
          limit: 5,
        } satisfies IMallPlatformCategory.IRequest,
      },
    );
  typia.assert(topLevelRepeat);
  TestValidator.equals(
    "top-level repeated browsing is deterministic",
    topLevelFirst,
    topLevelRepeat,
  );
  TestValidator.equals(
    "top-level page limit",
    topLevelFirst.pagination.limit,
    5,
  );
  TestValidator.equals(
    "top-level page number",
    topLevelFirst.pagination.current,
    1,
  );
  TestValidator.predicate(
    "top-level pagination records are non-negative",
    topLevelFirst.pagination.records >= 0 &&
      topLevelFirst.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "top-level results do not exceed requested limit",
    topLevelFirst.data.length <= topLevelFirst.pagination.limit,
  );
  for (const category of topLevelFirst.data) {
    TestValidator.equals(
      "top-level categories have no parent",
      category.parentCategory,
      null,
    );
  }
  const rootForChildren = topLevelFirst.data.find(
    (category) => category.parentCategory === null,
  );
  if (rootForChildren !== undefined) {
    const childPage =
      await api.functional.mallPlatform.customer.categories.index(
        customerConnection,
        {
          body: {
            parentCategoryId: rootForChildren.id,
            page: 1,
            limit: 10,
          } satisfies IMallPlatformCategory.IRequest,
        },
      );
    typia.assert(childPage);
    TestValidator.predicate(
      "child page results do not exceed requested limit",
      childPage.data.length <= childPage.pagination.limit,
    );
    for (const category of childPage.data) {
      TestValidator.equals(
        "child categories reference selected parent",
        category.parentCategory?.id,
        rootForChildren.id,
      );
    }
  }
  const emptyPageNumber = topLevelFirst.pagination.pages + 1;
  const emptyPage = await api.functional.mallPlatform.customer.categories.index(
    customerConnection,
    {
      body: {
        parentCategoryId: null,
        page: emptyPageNumber,
        limit: 5,
      } satisfies IMallPlatformCategory.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page current value",
    emptyPage.pagination.current,
    emptyPageNumber,
  );
  TestValidator.equals(
    "empty page returns no records",
    emptyPage.data.length,
    0,
  );
}
