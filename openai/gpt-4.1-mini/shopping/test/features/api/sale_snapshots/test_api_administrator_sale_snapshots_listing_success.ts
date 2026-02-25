import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
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
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_administrator_sale_snapshots_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin user and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = "12345678";
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      password: adminPassword,
    },
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
    },
  });
  typia.assert(adminLogin);
  // Create seller user and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = "12345678";
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerPassword,
    },
  });
  typia.assert(sellerLogin);
  // Create a sale record by the seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // Call snapshot listing endpoint as admin
  const { id: saleId } = sale;
  // Basic listing
  const baseResponse =
    await api.functional.shoppingMall.administrator.sales.snapshots.index(
      adminConnection,
      {
        saleId,
        body: {},
      },
    );
  typia.assert(baseResponse);
  TestValidator.equals(
    "pagination current page default",
    baseResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit default valid",
    baseResponse.pagination.limit > 0 && baseResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    baseResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    baseResponse.pagination.pages >= 0,
  );
  // If there is at least one snapshot, validate snapshot fields
  if (baseResponse.data.length !== 0) {
    for (const snapshot of baseResponse.data) {
      typia.assert(snapshot);
      // Sale inside snapshot
      typia.assert(snapshot.sale);
      // Essential fields non-empty or valid
      TestValidator.predicate(
        "snapshot id present",
        typeof snapshot.id === "string" && snapshot.id.length > 0,
      );
      TestValidator.predicate(
        "snapshot title present",
        typeof snapshot.title === "string" && snapshot.title.length > 0,
      );
      TestValidator.predicate(
        "snapshot description present",
        typeof snapshot.description === "string" &&
          snapshot.description.length >= 0,
      );
      TestValidator.predicate(
        "snapshot categoryId format",
        typeof snapshot.categoryId === "string" &&
          /^[0-9a-f-]{36}$/.test(snapshot.categoryId),
      );
      TestValidator.predicate(
        "snapshot basePrice valid",
        typeof snapshot.basePrice === "number" && snapshot.basePrice >= 0,
      );
      TestValidator.predicate(
        "snapshot createdAt format",
        typeof snapshot.createdAt === "string" &&
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
            snapshot.createdAt,
          ),
      );
      TestValidator.predicate(
        "snapshot updatedAt format",
        typeof snapshot.updatedAt === "string" &&
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
            snapshot.updatedAt,
          ),
      );
      // DeletedAt can be null or string format
      TestValidator.predicate(
        "snapshot deletedAt nullable",
        snapshot.deletedAt === null ||
          (typeof snapshot.deletedAt === "string" &&
            /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
              snapshot.deletedAt,
            )),
      );
      // Sale object validation
      const sale = snapshot.sale;
      TestValidator.predicate(
        "sale id format",
        typeof sale.id === "string" && /^[0-9a-f-]{36}$/.test(sale.id),
      );
      TestValidator.predicate(
        "sale name present",
        typeof sale.name === "string" && sale.name.length > 0,
      );
      TestValidator.predicate(
        "sale basePrice valid",
        typeof sale.basePrice === "number" && sale.basePrice >= 0,
      );
      TestValidator.predicate(
        "sale status present",
        typeof sale.status === "string" && sale.status.length > 0,
      );
      TestValidator.predicate(
        "sale createdAt format",
        typeof sale.createdAt === "string" &&
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
            sale.createdAt,
          ),
      );
      TestValidator.predicate(
        "sale updatedAt format",
        typeof sale.updatedAt === "string" &&
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
            sale.updatedAt,
          ),
      );
      TestValidator.predicate(
        "sale deletedAt nullable",
        sale.deletedAt === null ||
          (typeof sale.deletedAt === "string" &&
            /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
              sale.deletedAt,
            )),
      );
    }
  }
  // Date range filtering
  if (baseResponse.data.length > 0) {
    const firstCreatedAt = baseResponse.data[0].createdAt;
    const startDate = firstCreatedAt;
    // Filter with startDate
    const filteredResponse =
      await api.functional.shoppingMall.administrator.sales.snapshots.index(
        adminConnection,
        {
          saleId,
          body: {
            startDate,
          },
        },
      );
    typia.assert(filteredResponse);
    if (filteredResponse.data.length > 0) {
      for (const snapshot of filteredResponse.data) {
        TestValidator.predicate(
          "snapshot createdAt >= startDate",
          snapshot.createdAt >= startDate,
        );
      }
    }
  }
  // ChangeTypes filtering
  if (baseResponse.data.length > 0) {
    // Assuming snapshots have a changeTypes property (string[])
    const filteredByType =
      await api.functional.shoppingMall.administrator.sales.snapshots.index(
        adminConnection,
        {
          saleId,
          body: {
            changeTypes: ["update"],
          },
        },
      );
    typia.assert(filteredByType);
    if (filteredByType.data.length > 0) {
      for (const snapshot of filteredByType.data) {
        TestValidator.predicate(
          "snapshot changeTypes contains 'update'",
          snapshot.title.toLowerCase().includes("update") ||
            snapshot.description.toLowerCase().includes("update"),
        );
      }
    }
  }
  // Authorization enforcement check
  // Use a non-authorized connection
  const otherConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access rejected", async () => {
    await api.functional.shoppingMall.administrator.sales.snapshots.index(
      otherConnection,
      { saleId, body: {} },
    );
  });
}
