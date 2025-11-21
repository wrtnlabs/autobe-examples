import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";

export async function test_api_loyalty_point_transaction_retrieval_with_reversed_status(
  connection: api.IConnection,
) {
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  const loyaltyTransaction: IShoppingMallLoyaltyPointTransaction =
    typia.random<IShoppingMallLoyaltyPointTransaction>();
  loyaltyTransaction.status = "reversed";
  loyaltyTransaction.points = RandomGenerator.pick([10, -25, 50, -100]);
  loyaltyTransaction.order_id = typia.random<string & tags.Format<"uuid">>();

  const retrievedTransaction: IShoppingMallLoyaltyPointTransaction =
    await api.functional.shoppingMall.admin.promotions.loyalty_points.at(
      connection,
      {
        loyaltyPointId: loyaltyTransaction.id,
      },
    );
  typia.assert(retrievedTransaction);

  TestValidator.equals(
    "retrieved status matches",
    retrievedTransaction.status,
    "reversed",
  );
  TestValidator.equals(
    "retrieved points matches",
    retrievedTransaction.points,
    loyaltyTransaction.points,
  );
  TestValidator.equals(
    "retrieved order_id matches",
    retrievedTransaction.order_id,
    loyaltyTransaction.order_id,
  );
  TestValidator.equals(
    "retrieved id matches",
    retrievedTransaction.id,
    loyaltyTransaction.id,
  );
  TestValidator.predicate(
    "retrieved transaction has a non-zero points value",
    retrievedTransaction.points !== 0,
  );
}
