import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_communities_list_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Test public access to community listing without authentication
  const result = await api.functional.redditLike.communities.index(connection, {
    body: typia.random<IRedditLikeCommunity.IRequest>(),
  });
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination exists", typeof result.pagination, "object");
  TestValidator.equals(
    "pagination has current",
    typeof result.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof result.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof result.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof result.pagination.pages,
    "number",
  );
  // Validate data array structure
  TestValidator.equals("data array exists", Array.isArray(result.data), true);
  TestValidator.equals(
    "data matches record count",
    result.data.length,
    result.pagination.records,
  );
  // Validate individual community summary structure
  if (result.data.length > 0) {
    const firstCommunity = result.data[0];
    TestValidator.equals(
      "community has id",
      typeof firstCommunity.id,
      "string",
    );
    TestValidator.equals(
      "community has name",
      typeof firstCommunity.name,
      "string",
    );
    TestValidator.equals(
      "community has created_at",
      typeof firstCommunity.created_at,
      "string",
    );
    // Optional field: icon_url can be null or string
    TestValidator.predicate(
      "icon_url is valid",
      firstCommunity.icon_url === null ||
        (typeof firstCommunity.icon_url === "string" &&
          firstCommunity.icon_url.startsWith("http")),
    );
  }
}
