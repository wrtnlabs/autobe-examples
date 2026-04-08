import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_inventory_low_stock_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // Create authenticated connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${seller.token.access}`,
    },
  };
  // 2. Test default pagination (quantity_asc - lowest stock first)
  const defaultResult =
    await api.functional.ecommerceMall.seller.inventories.low_stock.index(
      authenticatedConnection,
      {
        body: {
          lowStockThreshold: 10,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(defaultResult);
  // Validate pagination structure exists
  TestValidator.predicate(
    "pagination object exists",
    !!defaultResult.pagination,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(defaultResult.data),
  );
  // 3. Test pagination with custom page and limit
  const page2Result =
    await api.functional.ecommerceMall.seller.inventories.low_stock.index(
      authenticatedConnection,
      {
        body: {
          page: 2,
          limit: 5,
          lowStockThreshold: 10,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(page2Result);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 2",
    page2Result.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit is 5",
    page2Result.pagination.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "records is non-negative",
    page2Result.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    page2Result.pagination.pagination.pages >= 0,
  );
  TestValidator.predicate("data length <= 5", page2Result.data.length <= 5);
  // 4. Test sorting by quantity_desc (highest stock first)
  const quantityDescResult =
    await api.functional.ecommerceMall.seller.inventories.low_stock.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "quantity_desc",
          lowStockThreshold: 10,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(quantityDescResult);
  // Validate quantity_desc sorting if data exists
  if (quantityDescResult.data.length > 1) {
    for (let i = 1; i < quantityDescResult.data.length; i++) {
      TestValidator.predicate(
        "quantity_desc sorting - higher stock first",
        quantityDescResult.data[i].quantity <=
          quantityDescResult.data[i - 1].quantity,
      );
    }
  }
  // 5. Test sorting by created_at_desc (newest variants first)
  const createdAtDescResult =
    await api.functional.ecommerceMall.seller.inventories.low_stock.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "created_at_desc",
          lowStockThreshold: 10,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(createdAtDescResult);
  // Validate created_at_desc sorting if data exists
  if (createdAtDescResult.data.length > 1) {
    for (let i = 1; i < createdAtDescResult.data.length; i++) {
      const prevDate = new Date(createdAtDescResult.data[i - 1].created_at);
      const currDate = new Date(createdAtDescResult.data[i].created_at);
      TestValidator.predicate(
        "created_at_desc sorting - newest first",
        currDate.getTime() <= prevDate.getTime(),
      );
    }
  }
  // 6. Test page 3 with limit 5
  const page3Result =
    await api.functional.ecommerceMall.seller.inventories.low_stock.index(
      authenticatedConnection,
      {
        body: {
          page: 3,
          limit: 5,
          sortBy: "quantity_asc",
          lowStockThreshold: 10,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(page3Result);
  TestValidator.equals(
    "current page is 3",
    page3Result.pagination.pagination.current,
    3,
  );
  TestValidator.predicate("data length <= 5", page3Result.data.length <= 5);
  // 7. Test quantity_asc explicit sorting
  const quantityAscResult =
    await api.functional.ecommerceMall.seller.inventories.low_stock.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "quantity_asc",
          lowStockThreshold: 10,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(quantityAscResult);
  // Validate quantity_asc sorting if data exists
  if (quantityAscResult.data.length > 1) {
    for (let i = 1; i < quantityAscResult.data.length; i++) {
      TestValidator.predicate(
        "quantity_asc sorting - lower stock first",
        quantityAscResult.data[i].quantity >=
          quantityAscResult.data[i - 1].quantity,
      );
    }
  }
  // 8. Verify pagination calculation consistency
  // When limit=1, pages should equal total records
  const singleLimitResult =
    await api.functional.ecommerceMall.seller.inventories.low_stock.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          limit: 1,
          lowStockThreshold: 10,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(singleLimitResult);
  TestValidator.predicate(
    "pagination records matches total",
    singleLimitResult.pagination.pagination.records ===
      defaultResult.pagination.pagination.records,
  );
  // 9. Test limit constraints (max 100)
  const maxLimitResult =
    await api.functional.ecommerceMall.seller.inventories.low_stock.index(
      authenticatedConnection,
      {
        body: {
          limit: 100,
          lowStockThreshold: 10,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit respected",
    maxLimitResult.pagination.pagination.limit,
    100,
  );
}
