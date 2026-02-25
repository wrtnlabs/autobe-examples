import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { generate_random_shopping_mall_seller_sales_units_create_unit } from "../../../generate/generate_random_shopping_mall_seller_sales_units_create_unit";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_unit } from "../../../prepare/prepare_random_shopping_mall_sale_unit";

export async function test_api_sale_unit_snapshot_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the retrieval of paginated snapshot list for a specific sale unit variant.
  // Setup: Administrator join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_administrator_join(
    adminConnection,
    { body: {} },
  );
  adminConnection.headers = {
    Authorization: `Bearer ${adminJoinResponse.token.access}`,
  };
  // Setup: Seller join and authorize
  const sellerJoinResponse = await authorize_seller_join(
    { host: connection.host },
    { body: {} },
  );
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerJoinResponse.token.access}` },
  };
  // Create a sale listing by the seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // Create a sale unit under the sale listing
  const saleUnit =
    await generate_random_shopping_mall_seller_sales_units_create_unit(
      sellerConnection,
      {
        params: { saleId: sale.id },
      },
    );
  typia.assert(saleUnit);
  // Prepare pagination request body for snapshots
  const requestBody: IShoppingMallSaleUnitSnapshot.IRequest = {
    page: 1,
    limit: 25,
  };
  // Retrieve paginated snapshot list by administrator
  const response =
    await api.functional.shoppingMall.administrator.sales.units.snapshots.indexSnapshots(
      adminConnection,
      {
        saleId: sale.id,
        unitId: saleUnit.id,
        body: requestBody,
      },
    );
  typia.assert(response);
  // Validate pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 25",
    response.pagination.limit === 25,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is consistent",
    response.pagination.pages >= 0 &&
      (response.pagination.records === 0
        ? response.pagination.pages === 0
        : response.pagination.pages > 0),
  );
  // Validate each snapshot structure
  for (const snapshot of response.data) {
    typia.assert<IShoppingMallSaleUnitSnapshot.ISummary>(snapshot);
    TestValidator.predicate(
      "snapshot skuCode is non-empty string",
      typeof snapshot.skuCode === "string" && snapshot.skuCode.length > 0,
    );
    TestValidator.predicate(
      "snapshot optionValues is a string",
      typeof snapshot.optionValues === "string",
    );
    TestValidator.predicate(
      "snapshot stockQuantity is non-negative integer",
      Number.isInteger(snapshot.stockQuantity) && snapshot.stockQuantity >= 0,
    );
    TestValidator.predicate(
      "snapshot isActive is boolean",
      typeof snapshot.isActive === "boolean",
    );
    TestValidator.predicate(
      "snapshot createdAt is ISO string",
      typeof snapshot.createdAt === "string" && snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot updatedAt is ISO string",
      typeof snapshot.updatedAt === "string" && snapshot.updatedAt.length > 0,
    );
  }
  // Negative test: unauthorized user should not access snapshots
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized access denies snapshot retrieval",
    async () => {
      await api.functional.shoppingMall.administrator.sales.units.snapshots.indexSnapshots(
        unauthorizedConnection,
        {
          saleId: sale.id,
          unitId: saleUnit.id,
          body: requestBody,
        },
      );
    },
  );
}
