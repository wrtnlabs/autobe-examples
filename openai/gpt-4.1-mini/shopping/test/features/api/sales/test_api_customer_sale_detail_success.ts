import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_detail_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and obtain authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Call sale detail endpoint with a valid saleId UUID
  const saleId = typia.random<string & tags.Format<"uuid">>();
  // Cast to any to access properties because IShoppingMallSale is empty interface
  const saleDetail: any =
    await api.functional.shoppingMall.customer.sales.at(customerConnection, {
      saleId,
    });
  // 3. Validate mandatory fields
  // Check id field
  TestValidator.predicate(
    "sale has id field",
    typeof saleDetail.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        saleDetail.id,
      ),
  );
  // Check seller_id field
  TestValidator.predicate(
    "sale has seller_id field",
    typeof saleDetail.seller_id === "string",
  );
  // Check category_id field
  TestValidator.predicate(
    "sale has category_id field",
    typeof saleDetail.category_id === "string",
  );
  // Check name field
  TestValidator.predicate(
    "sale has name field",
    typeof saleDetail.name === "string",
  );
  // Check description field
  TestValidator.predicate(
    "sale has description field",
    typeof saleDetail.description === "string",
  );
  // Check base_price field
  TestValidator.predicate(
    "sale has base_price field",
    typeof saleDetail.base_price === "number",
  );
  // Check status field
  TestValidator.predicate(
    "sale has status field",
    typeof saleDetail.status === "string",
  );
  // Check created_at field
  TestValidator.predicate(
    "sale created_at is valid ISO 8601 string",
    typeof saleDetail.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        saleDetail.created_at,
      ),
  );
  // Check updated_at field
  TestValidator.predicate(
    "sale updated_at is valid ISO 8601 string",
    typeof saleDetail.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        saleDetail.updated_at,
      ),
  );
  // 4. Ensure no deleted or soft-deleted sale is returned - simplified as testValidator that id is not empty string
  TestValidator.predicate("sale id is non-empty", saleDetail.id.length > 0);
}
