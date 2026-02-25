import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_sales_snapshots_list_success(
  connection: api.IConnection,
): Promise<void> {
  // This test covers the scenario of listing sale snapshots for a valid sale
  // by an authorized seller. It tests the seller join, sale creation, and
  // then retrieving snapshots with pagination, verifying the structure.
  // 1. Seller join authorization
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test-password-1234",
      shopName: "TestShop",
      shopDescription: "Test shop description",
      logoUri: null,
    },
  });
  typia.assert(sellerAuth);
  // Create new connection with authorization token of seller
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuth.token.access}` },
  };
  // 2. Create a new sale for this seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: "Test Sale " + RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"double"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(sale);
  // 3. Retrieve paginated list of sale snapshots with default paging parameters
  const snapshotsRequest: IShoppingMallSaleSnapshot.IRequest = {
    page: 1,
    limit: 10,
  };
  const snapshots =
    await api.functional.shoppingMall.seller.sales.snapshots.index(
      sellerConnection,
      {
        saleId: sale.id,
        body: snapshotsRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate pagination metadata properties
  TestValidator.predicate(
    "pagination current page >= 1",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit between 1 and 100",
    snapshots.pagination.limit >= 1 && snapshots.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    snapshots.pagination.pages >= 0,
  );
  // 5. Validate snapshots array
  TestValidator.predicate(
    "snapshots data is array",
    Array.isArray(snapshots.data),
  );
  // 6. If there are snapshots, validate their structure
  if (snapshots.data.length > 0) {
    snapshots.data.forEach((snapshot) => {
      typia.assert(snapshot);
      TestValidator.predicate(
        "snapshot id is uuid format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.id,
        ),
      );
      TestValidator.predicate(
        "snapshot title non-empty string",
        typeof snapshot.title === "string" && snapshot.title.length > 0,
      );
      TestValidator.predicate(
        "snapshot description is string",
        typeof snapshot.description === "string",
      );
      TestValidator.predicate(
        "snapshot categoryId is uuid format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.categoryId,
        ),
      );
      TestValidator.predicate(
        "snapshot basePrice positive number",
        typeof snapshot.basePrice === "number" && snapshot.basePrice > 0,
      );
      TestValidator.predicate(
        "snapshot createdAt is ISO date string",
        !isNaN(Date.parse(snapshot.createdAt)),
      );
      TestValidator.predicate(
        "snapshot updatedAt is ISO date string",
        !isNaN(Date.parse(snapshot.updatedAt)),
      );
      TestValidator.predicate(
        "snapshot deletedAt is null or ISO date string",
        snapshot.deletedAt === null || !isNaN(Date.parse(snapshot.deletedAt!)),
      );
      // Validate sale structure inside snapshot
      typia.assert(snapshot.sale);
      TestValidator.predicate(
        "sale id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.sale.id,
        ),
      );
      TestValidator.predicate(
        "sale name is non-empty string",
        typeof snapshot.sale.name === "string" && snapshot.sale.name.length > 0,
      );
      TestValidator.predicate(
        "sale basePrice positive",
        typeof snapshot.sale.basePrice === "number" &&
          snapshot.sale.basePrice > 0,
      );
      TestValidator.predicate(
        "sale status is string",
        typeof snapshot.sale.status === "string",
      );
      TestValidator.predicate(
        "sale createdAt is ISO date time",
        !isNaN(Date.parse(snapshot.sale.createdAt)),
      );
      TestValidator.predicate(
        "sale updatedAt is ISO date time",
        !isNaN(Date.parse(snapshot.sale.updatedAt)),
      );
      if (
        snapshot.sale.deletedAt !== null &&
        snapshot.sale.deletedAt !== undefined
      ) {
        TestValidator.predicate(
          "sale deletedAt is ISO date time or null",
          !isNaN(Date.parse(snapshot.sale.deletedAt)),
        );
      } else {
        TestValidator.equals(
          "sale deletedAt is null",
          snapshot.sale.deletedAt,
          null,
        );
      }
      // Validate seller summary inside sale
      typia.assert(snapshot.sale.seller);
      TestValidator.predicate(
        "seller id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.sale.seller.id,
        ),
      );
      TestValidator.predicate(
        "seller email is string",
        typeof snapshot.sale.seller.email === "string",
      );
      TestValidator.predicate(
        "seller shopName is string",
        typeof snapshot.sale.seller.shopName === "string",
      );
      TestValidator.predicate(
        "seller approvalStatus is string",
        typeof snapshot.sale.seller.approvalStatus === "string",
      );
    });
  }
}
