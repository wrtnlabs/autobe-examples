import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_join_success(
  connection: api.IConnection,
) {
  // Generate a realistic new seller account creation request body
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  // Call the join endpoint to create the seller account
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body,
    });
  typia.assert(seller);

  // Validate returned seller account properties
  TestValidator.predicate(
    "seller.id is a uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      seller.id,
    ),
  );
  TestValidator.predicate(
    "seller.status is active",
    seller.status === "active",
  );
  TestValidator.predicate(
    "seller.business_status is pending or approved or rejected",
    seller.business_status === "pending" ||
      seller.business_status === "approved" ||
      seller.business_status === "rejected",
  );
  TestValidator.predicate(
    "seller.token.access is non-empty string",
    typeof seller.token.access === "string" && seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "seller.token.refresh is non-empty string",
    typeof seller.token.refresh === "string" && seller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "seller.token.expired_at is ISO8601 date-time",
    typeof seller.token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3,})?Z$/.test(
        seller.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "seller.token.refreshable_until is ISO8601 date-time",
    typeof seller.token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3,})?Z$/.test(
        seller.token.refreshable_until,
      ),
  );
}
