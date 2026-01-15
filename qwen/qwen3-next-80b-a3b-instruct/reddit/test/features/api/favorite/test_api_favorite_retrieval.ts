import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleFavorite";
export async function test_api_favorite_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for the favorite ID
  const favoriteId: string = typia.random<string & tags.Format<"uuid">>();
  // Create an isolated connection for this test
  const testConnection: api.IConnection = { host: connection.host };
  // Fetch the favorite item by its ID
  const favorite: ICommunityPlatformSaleFavorite =
    await api.functional.communityPlatform.favorites.at(testConnection, {
      favoriteId,
    });
  // Validate response structure using typia.assert
  typia.assert(favorite);
  // Verify that all required properties are present and of correct type
  TestValidator.predicate(
    "product_name is string",
    typeof favorite.product_name === "string",
  );
  TestValidator.predicate(
    "product_category is string",
    typeof favorite.product_category === "string",
  );
  TestValidator.predicate(
    "favorite_timestamp is ISO 8601 date-time string",
    typeof favorite.favorite_timestamp === "string" &&
      !isNaN(Date.parse(favorite.favorite_timestamp)),
  );
}
