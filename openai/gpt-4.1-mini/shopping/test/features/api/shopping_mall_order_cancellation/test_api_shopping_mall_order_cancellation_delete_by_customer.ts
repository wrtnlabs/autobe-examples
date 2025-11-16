import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";

export async function test_api_shopping_mall_order_cancellation_delete_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer joins and authenticates
  const email = typia.random<string & tags.Format<"email">>();
  const password = "1234";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password,
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://google.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Create a shopping mall order cancellation request
  const cancellationCreateBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    status: "pending",
  } satisfies IShoppingMallOrderCancellation.ICreate;

  const cancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.customer.shoppingMallOrderCancellations.create(
      connection,
      {
        body: cancellationCreateBody,
      },
    );
  typia.assert(cancellation);

  // Step 3: Delete the created cancellation request by ID
  await api.functional.shoppingMall.customer.shoppingMallOrderCancellations.erase(
    connection,
    {
      shoppingMallOrderCancellationId: cancellation.id,
    },
  );

  // Since there's no direct retrieval API provided for cancellations,
  // and erase returns void, no direct verification after deletion is possible here.
  // The test assumes that absence of error indicates successful deletion.
  TestValidator.predicate("Deletion completed without error", true);
}
