import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentDispute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDispute";
import type { IShoppingMallPaymentDisputeEvidence } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDisputeEvidence";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_payment_dispute_retrieval_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Call the disputes index endpoint using admin connection
  const disputesResponse: IPageIShoppingMallPaymentDispute =
    await api.functional.shoppingMall.admin.dashboard.payments.disputes.index(
      adminConnection,
    );
  // Step 3: Validate the response structure and pagination
  typia.assert(disputesResponse);
  // Step 4: Validate pagination properties
  TestValidator.equals(
    "current page should be 1",
    disputesResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    disputesResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 0",
    disputesResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    disputesResponse.pagination.pages,
    0,
  );
  // Step 5: Validate data array is empty
  TestValidator.equals(
    "data array should be empty",
    disputesResponse.data.length,
    0,
  );
}
