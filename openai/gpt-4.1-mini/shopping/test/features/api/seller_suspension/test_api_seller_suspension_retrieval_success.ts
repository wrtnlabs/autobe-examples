import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_suspension_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  // 2. Create a random seller suspension record to test retrieval
  // Since creation endpoint not provided, simulate retrieval with a random known UUID
  // We assume we have to test retrieval with some valid UUID (simulate by random), so rely on API random data
  const testSuspension =
    await api.functional.shoppingMall.administrator.sellerSuspensions.at(
      adminConnection,
      {
        sellerSuspensionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(testSuspension);
  // Assert all required fields in the response
  TestValidator.predicate(
    "has id",
    typeof testSuspension.id === "string" && testSuspension.id.length > 0,
  );
  TestValidator.predicate(
    "has seller summary",
    testSuspension.seller !== null && typeof testSuspension.seller === "object",
  );
  TestValidator.predicate(
    "seller summary has id",
    typeof testSuspension.seller.id === "string",
  );
  TestValidator.predicate(
    "seller summary has email",
    typeof testSuspension.seller.email === "string",
  );
  TestValidator.predicate(
    "seller summary has shopName",
    typeof testSuspension.seller.shopName === "string",
  );
  TestValidator.predicate(
    "has suspension_reason",
    typeof testSuspension.suspension_reason === "string",
  );
  TestValidator.predicate(
    "has suspended_at",
    typeof testSuspension.suspended_at === "string",
  );
  TestValidator.predicate(
    "has created_at",
    typeof testSuspension.created_at === "string",
  );
  TestValidator.predicate(
    "has updated_at",
    typeof testSuspension.updated_at === "string",
  );
  TestValidator.predicate(
    "deleted_at is string or null",
    testSuspension.deleted_at === null ||
      typeof testSuspension.deleted_at === "string",
  );
  // 3. Unauthorized access test
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "Unauthorized access should fail",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sellerSuspensions.at(
        anonymousConnection,
        {
          sellerSuspensionId: testSuspension.id,
        },
      );
    },
  );
}
