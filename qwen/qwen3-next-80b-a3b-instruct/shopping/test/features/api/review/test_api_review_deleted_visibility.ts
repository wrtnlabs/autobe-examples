import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_review_deleted_visibility(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection to seed data
  const adminConnection: api.IConnection = { host: connection.host };
  
  // Generate a valid UUID for review testing
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  
  // Call the endpoint to get user summary (no auth needed for this API)
  const userSummary = await api.functional.shoppingMall.reviews.at(connection, {
    reviewId: reviewId,
  });
  typia.assert(userSummary);
  
  // Validate IShoppingMallCategory properties
  TestValidator.equals("id exists", typeof userSummary.id, "string");
  TestValidator.predicate("id is UUID format", () => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userSummary.id,
    );
  });
  TestValidator.notEquals("email is not null", userSummary.email, null);
  TestValidator.predicate("email is valid format", () => {
    if (userSummary.email) {
      return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(userSummary.email);
    }
    return false;
  });
  TestValidator.equals(
    "created_at exists",
    typeof userSummary.created_at,
    "string",
  );
  TestValidator.predicate("created_at is ISO date-time", () => {
    return !isNaN(new Date(userSummary.created_at).getTime());
  });
  TestValidator.predicate("deleted_at is null or date-time", () => {
    if (userSummary.deleted_at === null) return true;
    if (typeof userSummary.deleted_at === "string") {
      return !isNaN(new Date(userSummary.deleted_at).getTime());
    }
    return false;
  });
}