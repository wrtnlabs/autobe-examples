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

export async function test_api_sale_unit_snapshot_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Verify authorization enforcement for sale unit snapshot retrieval.
  // 1. Attempt unauthorized API call, expect access denied.
  // 2. Administrator joins and logs in.
  // 3. Seller joins and logs in.
  // 4. Seller creates a sale.
  // 5. Seller creates a sale unit under that sale.
  // 6. Administrator retrieves sale unit snapshots successfully.
  // Prepare base connection for reuse
  const baseConnection: api.IConnection = { host: connection.host };
  // 1. Attempt unauthorized snapshot retrieval with base connection (no admin auth)
  await TestValidator.httpError(
    "unauthorized access rejection for sale unit snapshots",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sales.units.snapshots.indexSnapshots(
        baseConnection,
        {
          saleId: typia.random<string & tags.Format<"uuid">>(),
          unitId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );
  // 2. Administrator join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "aStrongPassword123",
    },
  });
  typia.assert(adminAuth);
  // After join adminConnection.headers updated
  // 3. Administrator login (redundant for demonstration, keeping it as specified)
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: "aStrongPassword123",
    },
  });
  // 4. Seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongSellerPass123",
      shopName: RandomGenerator.name(2),
    },
  });
  typia.assert(sellerAuth);
  // 5. Seller login (optional step, as join usually returns token)
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "StrongSellerPass123",
    },
  });
  // 6. Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        base_price: typia.random<
          number & tags.Type<"double"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(sale);
  // 7. Seller creates a sale unit
  const saleUnit =
    await generate_random_shopping_mall_seller_sales_units_create_unit(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {
          sku_code: RandomGenerator.alphabets(8),
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
        },
      },
    );
  typia.assert(saleUnit);
  // 8. Unauthorized sale unit snapshots retrieval fails using base connection
  await TestValidator.httpError(
    "unauthorized sale unit snapshots access before admin auth",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sales.units.snapshots.indexSnapshots(
        baseConnection,
        {
          saleId: sale.id,
          unitId: saleUnit.id,
          body: {
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );
  // 9. Authorized snapshot retrieval by administrator
  const snapshots =
    await api.functional.shoppingMall.administrator.sales.units.snapshots.indexSnapshots(
      adminConnection,
      {
        saleId: sale.id,
        unitId: saleUnit.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshots);
  // 10. Validate pagination info
  TestValidator.predicate(
    "valid pagination current page",
    snapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    snapshots.pagination.pages >= 0,
  );
}
