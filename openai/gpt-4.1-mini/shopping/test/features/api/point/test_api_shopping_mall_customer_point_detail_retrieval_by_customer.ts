import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPoints";

export async function test_api_shopping_mall_customer_point_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer authenticates and joins
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "strongpassword123",
        href: "https://test.com/signup",
        referrer: "https://test.com/home",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a points record for the authenticated customer
  const createRequestBody = {
    balance: 100,
  } satisfies IShoppingMallPoints.ICreate;
  const pointRecord: IShoppingMallPoints =
    await api.functional.shoppingMall.customer.points.create(connection, {
      body: createRequestBody,
    });
  typia.assert(pointRecord);

  TestValidator.equals(
    "Created point record customer ID matches auth customer",
    pointRecord.shopping_mall_customer_id,
    customer.id,
  );

  // 3. Retrieve the detailed point by pointId
  const pointDetail: IShoppingMallPoints =
    await api.functional.shoppingMall.customer.points.at(connection, {
      pointId: pointRecord.id,
    });
  typia.assert(pointDetail);

  // 4. Validate retrieved point details match
  TestValidator.equals(
    "Retrieved point id matches pointRecord.id",
    pointDetail.id,
    pointRecord.id,
  );
  TestValidator.equals(
    "Retrieved point balance matches pointRecord.balance",
    pointDetail.balance,
    pointRecord.balance,
  );
  TestValidator.equals(
    "Retrieved point shopping_mall_customer_id matches auth customer id",
    pointDetail.shopping_mall_customer_id,
    customer.id,
  );

  // 5. Validate timestamps presence and deleted_at null
  TestValidator.predicate(
    "created_at is a valid date-time string",
    typeof pointDetail.created_at === "string" &&
      pointDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a valid date-time string",
    typeof pointDetail.updated_at === "string" &&
      pointDetail.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", pointDetail.deleted_at, null);
}
