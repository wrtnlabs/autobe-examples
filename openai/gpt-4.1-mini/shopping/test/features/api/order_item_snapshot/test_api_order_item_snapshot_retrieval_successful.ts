import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_snapshot_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin+${RandomGenerator.alphaNumeric(5)}@test.com`,
      password: "admin-password",
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Prepare filter criteria
  const productNameFilter =
    RandomGenerator.substring("Amazing Product") || "Amazing";
  const variantSkuFilter = RandomGenerator.alphaNumeric(8);
  const itemStatusFilter = "paid";
  const sellerShopNameFilter = RandomGenerator.name(2);
  // Date range filter
  const createdFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const createdTo = new Date().toISOString(); // now
  // Pagination and sort
  const page = 1 as const;
  const limit = 20 as const;
  const sortOptions: Array<
    "created_at" | "-created_at" | "product_name" | "-product_name"
  > = ["created_at", "-created_at", "product_name", "-product_name"];
  // Test each sort option individually
  for (const sort of sortOptions) {
    const body: IShoppingMallOrderItemSnapshot.IRequest = {
      productName: productNameFilter,
      variantSku: variantSkuFilter,
      itemStatus: itemStatusFilter,
      sellerShopName: sellerShopNameFilter,
      createdAtFrom: createdFrom,
      createdAtTo: createdTo,
      page,
      limit,
      sort,
    };
    const response =
      await api.functional.shoppingMall.administrator.orderItemSnapshots.index(
        adminConnection,
        { body },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.predicate(
      `pagination current page is ${page}`,
      response.pagination.current === page,
    );
    TestValidator.predicate(
      `pagination limit is ${limit}`,
      response.pagination.limit === limit,
    );
    TestValidator.predicate(
      `pagination records >= 0`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages >= 0`,
      response.pagination.pages >= 0,
    );
    // Validate pagination page consistency
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      `pagination pages consistent calculated`,
      response.pagination.pages,
      expectedPages,
    );
    // Confirm each data item matches filters (partial match for string filters)
    for (const item of response.data) {
      typia.assert(item);
      if (body.productName !== undefined) {
        TestValidator.predicate(
          "product name contains filter",
          item.productName.includes(body.productName),
        );
      }
      if (body.variantSku !== undefined) {
        TestValidator.predicate(
          "variant SKU contains filter",
          item.variantSku.includes(body.variantSku),
        );
      }
      if (body.itemStatus !== undefined) {
        TestValidator.equals(
          "item status matches",
          item.itemStatus,
          body.itemStatus,
        );
      }
      if (body.sellerShopName !== undefined) {
        TestValidator.predicate(
          "seller shop name contains filter",
          item.sellerShopName.includes(body.sellerShopName),
        );
      }
      // Validate createdAt falls within range
      if (body.createdAtFrom) {
        TestValidator.predicate(
          `createdAt >= ${body.createdAtFrom}`,
          new Date(item.createdAt) >= new Date(body.createdAtFrom),
        );
      }
      if (body.createdAtTo) {
        TestValidator.predicate(
          `createdAt <= ${body.createdAtTo}`,
          new Date(item.createdAt) <= new Date(body.createdAtTo),
        );
      }
      // Validate immutability of snapshot fields (cannot be changed, so no further mutations)
      TestValidator.predicate("unitPrice is non-negative", item.unitPrice >= 0);
      TestValidator.predicate("quantity is positive", item.quantity > 0);
      TestValidator.predicate(
        "id is uuid format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          item.id,
        ),
      );
      // Check presence of other expected properties
      TestValidator.predicate(
        "has variantOptionValues",
        typeof item.variantOptionValues === "string",
      );
      TestValidator.predicate(
        "sellerLogoUri can be string or null or undefined",
        item.sellerLogoUri === undefined ||
          item.sellerLogoUri === null ||
          typeof item.sellerLogoUri === "string",
      );
      // Timestamps must be ISO date-time strings parseable
      TestValidator.predicate(
        "createdAt is valid date-time string",
        !isNaN(Date.parse(item.createdAt)),
      );
      TestValidator.predicate(
        "updatedAt is valid date-time string",
        !isNaN(Date.parse(item.updatedAt)),
      );
      if (item.deletedAt !== undefined) {
        TestValidator.predicate(
          "deletedAt is null or valid date-time string",
          item.deletedAt === null || !isNaN(Date.parse(item.deletedAt)),
        );
      }
    }
  }
}
