import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSpecification";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_analytics_sale_specifications_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and gets authorized
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  typia.assert(adminAuthorized);
  // Update adminConnection headers with token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Query for sale specifications with empty filters (get first page)
  const emptyRequest: IShoppingMallSaleSpecification.IRequest = {};
  const page1 =
    await api.functional.shoppingMall.administrator.analytics.sale_specifications.index(
      adminConnection,
      { body: emptyRequest },
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is >= 1",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    page1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    page1.pagination.records >= 0,
  );
  // Validate data array
  for (const spec of page1.data) {
    typia.assert(spec);
    // Ensure specification keys and values are non-empty strings
    TestValidator.predicate(
      "specificationKey is non-empty string",
      typeof spec.specificationKey === "string" &&
        spec.specificationKey.length > 0,
    );
    TestValidator.predicate(
      "specificationValue is non-empty string",
      typeof spec.specificationValue === "string" &&
        spec.specificationValue.length > 0,
    );
    // Ensure linked shoppingMallSale is valid
    typia.assert(spec.shoppingMallSale);
    TestValidator.predicate(
      "shoppingMallSale id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        spec.shoppingMallSale.id,
      ),
    );
    // The spec should not be deleted
    TestValidator.predicate(
      "spec.deletedAt is null or undefined",
      spec.deletedAt === null || spec.deletedAt === undefined,
    );
  }
  // 3. Validate that unauthorized access is forbidden
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "access forbidden without authorization",
    async () => {
      await api.functional.shoppingMall.administrator.analytics.sale_specifications.index(
        unauthConnection,
        { body: emptyRequest },
      );
    },
  );
  // 4. Validate filtering by specificationKey if at least one exists
  if (page1.data.length > 0) {
    // Pick one existing key
    const keyToFilter = page1.data[0].specificationKey;
    const filterRequest: IShoppingMallSaleSpecification.IRequest = {
      specificationKey: keyToFilter,
    };
    const filteredPage =
      await api.functional.shoppingMall.administrator.analytics.sale_specifications.index(
        adminConnection,
        { body: filterRequest },
      );
    typia.assert(filteredPage);
    // All results should have the filter key
    for (const spec of filteredPage.data) {
      TestValidator.predicate(
        "filtered spec has matching specificationKey",
        spec.specificationKey.includes(keyToFilter),
      );
      TestValidator.predicate(
        "filtered spec is not deleted",
        spec.deletedAt === null || spec.deletedAt === undefined,
      );
    }
  }
  // 5. Validate pagination limit and page number
  const limitRequest: IShoppingMallSaleSpecification.IRequest = {
    limit: 3,
    page: 1,
  };
  const limitedPage =
    await api.functional.shoppingMall.administrator.analytics.sale_specifications.index(
      adminConnection,
      { body: limitRequest },
    );
  typia.assert(limitedPage);
  TestValidator.predicate(
    "limited page data length is <= limit",
    limitedPage.data.length <= 3,
  );
  if (limitedPage.pagination.pages >= 2) {
    const page2Request: IShoppingMallSaleSpecification.IRequest = {
      ...limitRequest,
      page: 2,
    };
    const page2 =
      await api.functional.shoppingMall.administrator.analytics.sale_specifications.index(
        adminConnection,
        { body: page2Request },
      );
    typia.assert(page2);
    TestValidator.predicate(
      "page 2 data different from page 1",
      page2.data.length > 0 &&
        !page2.data.every((x) => limitedPage.data.find((y) => y.id === x.id)),
    );
  }
}
