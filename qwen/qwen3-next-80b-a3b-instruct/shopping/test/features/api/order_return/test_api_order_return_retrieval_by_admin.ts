import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";
import type { IShoppingMallOrderReturnItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnItem";
import type { IShoppingMallReturnAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnAddress";
import type { IShoppingMallReturnShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShippingMethod";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_return_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // Step 2: Retrieve return information using the admin connection with placeholder values
  // Note: In a real test environment, these would be real orderCode and returnCode values
  // from pre-existing test data. We use random values here as placeholders since we cannot create data.
  const orderCode = RandomGenerator.alphaNumeric(10);
  const returnCode = RandomGenerator.alphaNumeric(10);
  // Call the API endpoint to retrieve return information
  const returnInfo = await api.functional.shoppingMall.admin.orders.returns.at(
    adminConnection,
    {
      orderCode,
      returnCode,
    },
  );
  // Step 3: Validate the returned return information structure
  // Since typia.assert() provides complete type validation, we only need to check key properties
  typia.assert(returnInfo);
  // Validate that the returnInfo is an IShoppingMallOrderReturn with correct structure
  TestValidator.equals(
    "returnCode is a string",
    typeof returnInfo.returnCode,
    "string",
  );
  TestValidator.equals(
    "orderCode is a string",
    typeof returnInfo.orderCode,
    "string",
  );
  TestValidator.predicate(
    "status is valid",
    ["requested", "pending", "processed", "rejected", "completed"].includes(
      returnInfo.status,
    ),
  );
  TestValidator.predicate(
    "refundAmount is a number",
    typeof returnInfo.refundAmount === "number",
  );
  TestValidator.predicate(
    "refundAmount is non-negative",
    returnInfo.refundAmount >= 0,
  );
  TestValidator.predicate("items is an array", Array.isArray(returnInfo.items));
  TestValidator.predicate(
    "requestedAt is a valid date-time string",
    typeof returnInfo.requestedAt === "string" &&
      new Date(returnInfo.requestedAt).toISOString() === returnInfo.requestedAt,
  );
  // For optional properties, verify their types if they exist
  if (returnInfo.returnShippingMethod !== undefined) {
    TestValidator.predicate(
      "returnShippingMethod has expected structure",
      typeof returnInfo.returnShippingMethod === "object" &&
        returnInfo.returnShippingMethod !== null,
    );
  }
  if (returnInfo.returnAddress !== undefined) {
    TestValidator.predicate(
      "returnAddress has expected structure",
      typeof returnInfo.returnAddress === "object" &&
        returnInfo.returnAddress !== null,
    );
  }
  if (returnInfo.notes !== undefined) {
    TestValidator.equals(
      "notes is a string",
      typeof returnInfo.notes,
      "string",
    );
  }
}
