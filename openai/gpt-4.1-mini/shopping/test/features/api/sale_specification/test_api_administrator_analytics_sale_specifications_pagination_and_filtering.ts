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

export async function test_api_administrator_analytics_sale_specifications_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
    },
  });
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // Testing pagination boundary: page number beyond available pages
  {
    const pageReq = {
      page: 9999,
      limit: 10,
    } satisfies IShoppingMallSaleSpecification.IRequest;
    const response =
      await api.functional.shoppingMall.administrator.analytics.sale_specifications.index(
        adminConnection,
        { body: pageReq },
      );
    typia.assert(response);
    // Validate empty data for out-of-bound page
    TestValidator.equals(
      "pagination current page",
      response.pagination.current,
      9999,
    );
    TestValidator.predicate(
      "pagination data is empty",
      response.data.length === 0,
    );
  }
  // Testing filter by specificationKey
  {
    const filterKey = "color";
    const filterReq = {
      specificationKey: filterKey,
      page: 1,
      limit: 20,
    } satisfies IShoppingMallSaleSpecification.IRequest;
    const response =
      await api.functional.shoppingMall.administrator.analytics.sale_specifications.index(
        adminConnection,
        { body: filterReq },
      );
    typia.assert(response);
    // Assert all returned specifications include the filter key and are not deleted
    response.data.forEach((spec) => {
      TestValidator.predicate(
        `specificationKey matches ${filterKey}`,
        spec.specificationKey.includes(filterKey) &&
          (spec.deletedAt === null || spec.deletedAt === undefined),
      );
    });
  }
  // Testing filter by specificationValue
  {
    const filterValue = "metal";
    const filterReq = {
      specificationValue: filterValue,
      page: 1,
      limit: 20,
    } satisfies IShoppingMallSaleSpecification.IRequest;
    const response =
      await api.functional.shoppingMall.administrator.analytics.sale_specifications.index(
        adminConnection,
        { body: filterReq },
      );
    typia.assert(response);
    // Assert all returned specifications include the filter value and are not deleted
    response.data.forEach((spec) => {
      TestValidator.predicate(
        `specificationValue matches ${filterValue}`,
        spec.specificationValue.includes(filterValue) &&
          (spec.deletedAt === null || spec.deletedAt === undefined),
      );
    });
  }
  // Testing deleted or logically removed specifications are excluded
  {
    const req = {
      page: 1,
      limit: 50,
    } satisfies IShoppingMallSaleSpecification.IRequest;
    const response =
      await api.functional.shoppingMall.administrator.analytics.sale_specifications.index(
        adminConnection,
        { body: req },
      );
    typia.assert(response);
    response.data.forEach((spec) => {
      TestValidator.predicate(
        "specification not deleted",
        spec.deletedAt === null || spec.deletedAt === undefined,
      );
    });
  }
  // Testing unauthorized access rejected
  {
    const unauthorizedConnection: api.IConnection = { host: connection.host };
    // No authorization header
    const req = {
      page: 1,
      limit: 10,
    } satisfies IShoppingMallSaleSpecification.IRequest;
    await TestValidator.httpError(
      "unauthorized access rejected",
      401,
      async () => {
        await api.functional.shoppingMall.administrator.analytics.sale_specifications.index(
          unauthorizedConnection,
          { body: req },
        );
      },
    );
  }
}
