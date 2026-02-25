import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_history_filtered_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and is authorized
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongpassword123",
      shopName: RandomGenerator.name(2),
      shopDescription: "Test shop for inventory history",
      logoUri: null,
    },
  });
  typia.assert(authorizedSeller);
  // Update sellerConnection with auth token
  sellerConnection.headers = {};
  sellerConnection.headers["Authorization"] = authorizedSeller.token.access;
  // Prepare filter criteria
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const startDate = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString();
  const reasonFilter = "restock";
  const requestBody: IShoppingMallInventoryHistory.IRequest = {
    shoppingMallProductVariantId: variantId,
    startDate: startDate,
    endDate: endDate,
    reason: reasonFilter,
    page: 1,
    limit: 10,
  };
  // Call the PATCH /shoppingMall/seller/inventoryHistories endpoint
  const response =
    await api.functional.shoppingMall.seller.inventoryHistories.index(
      sellerConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // Validate pagination info
  TestValidator.predicate(
    "pagination current page is valid",
    response.pagination.current >= 1 &&
      response.pagination.current <= response.pagination.pages,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array
  for (const item of response.data) {
    typia.assert(item);
    TestValidator.equals(
      "variant id matches filter",
      item.shoppingMallProductVariantId,
      variantId,
    );
    TestValidator.equals("reason matches filter", item.reason, reasonFilter);
    TestValidator.predicate(
      "quantityDelta is integer",
      Number.isInteger(item.quantityDelta),
    );
    typia.assert(item.id);
    TestValidator.predicate(
      "createdAt is valid date",
      !isNaN(Date.parse(item.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is valid date",
      !isNaN(Date.parse(item.updatedAt)),
    );
    if (item.deletedAt !== null && item.deletedAt !== undefined) {
      TestValidator.predicate(
        "deletedAt is valid date or null",
        !isNaN(Date.parse(item.deletedAt)),
      );
    }
    // Validate productVariant summary
    typia.assert(item.productVariant);
    const variant = item.productVariant;
    typia.assert(variant.id);
    TestValidator.predicate(
      "productVariant skuCode is string",
      typeof variant.skuCode === "string",
    );
    TestValidator.predicate(
      "productVariant stockQuantity is number",
      typeof variant.stockQuantity === "number",
    );
    TestValidator.predicate(
      "productVariant createdAt is valid date",
      !isNaN(Date.parse(variant.createdAt)),
    );
    TestValidator.predicate(
      "productVariant updatedAt is valid date",
      !isNaN(Date.parse(variant.updatedAt)),
    );
  }
}
