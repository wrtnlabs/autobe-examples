import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_unit_snapshots_index_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for customer actor
  const customerConnection: api.IConnection = { host: connection.host };
  // Authorize as a new customer via customer join
  const authorized = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(authorized);
  // After authorization, the customerConnection headers are not automatically set by authorize_customer_join,
  // so we set the Authorization header manually using the access token
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Call the sale unit snapshots index endpoint with empty request body to fetch data
  const output =
    await api.functional.shoppingMall.customer.sale_unit_snapshots.index(
      customerConnection,
      {
        body: {},
      },
    );
  // Validate response type
  typia.assert(output);
  // Additional validation: ensure pagination and data exist
  // Pagination properties
  TestValidator.predicate(
    "pagination current page is positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // Data array type and length check
  TestValidator.predicate("data array exists", Array.isArray(output.data));
  if (output.data.length > 0) {
    const snapshot = output.data[0];
    TestValidator.predicate(
      "snapshot skuCode is string",
      typeof (snapshot as any).skuCode === "string",
    );
    TestValidator.predicate(
      "snapshot optionValues is array",
      Array.isArray((snapshot as any).optionValues),
    );
    TestValidator.predicate(
      "snapshot priceOverride is number",
      typeof (snapshot as any).priceOverride === "number",
    );
    TestValidator.predicate(
      "snapshot stockQuantity is number",
      typeof (snapshot as any).stockQuantity === "number",
    );
    TestValidator.predicate(
      "snapshot isActive is boolean",
      typeof (snapshot as any).isActive === "boolean",
    );
    TestValidator.predicate(
      "snapshot createdAt is string",
      typeof (snapshot as any).createdAt === "string",
    );
    TestValidator.predicate(
      "snapshot updatedAt is string",
      typeof (snapshot as any).updatedAt === "string",
    );
    // deletedAt can be null or string
    TestValidator.predicate(
      "snapshot deletedAt is string or null",
      (snapshot as any).deletedAt === null || typeof (snapshot as any).deletedAt === "string",
    );
  }
}
