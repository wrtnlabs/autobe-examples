import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_search_authentication_optional(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search without authentication (anonymous/guest access)
  // This endpoint is public and doesn't require authentication
  const anonymousResult = await api.functional.redditLike.members.index(
    connection,
    {
      body: {
        search: "test",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(anonymousResult);
  // Test 2: Verify pagination structure matches schema
  TestValidator.predicate(
    "pagination exists and has required fields",
    () =>
      anonymousResult.pagination !== undefined &&
      anonymousResult.pagination.current >= 0 &&
      anonymousResult.pagination.limit > 0 &&
      anonymousResult.pagination.records >= 0 &&
      anonymousResult.pagination.pages >= 0,
  );
  // Test 3: Verify data array structure
  TestValidator.predicate("data array exists and is valid", () =>
    Array.isArray(anonymousResult.data),
  );
  // Test 4: Verify member summary structure (if data exists)
  if (anonymousResult.data.length > 0) {
    const firstMember = anonymousResult.data[0];
    TestValidator.equals(
      "member id is uuid format string",
      firstMember.id,
      firstMember.id,
    );
    TestValidator.equals(
      "member entity_type is valid",
      ["post", "comment", "community"].includes(firstMember.entity_type),
      true,
    );
    TestValidator.predicate(
      "member title is string",
      () => typeof firstMember.title === "string",
    );
    TestValidator.predicate(
      "member content is string within max length",
      () =>
        typeof firstMember.content === "string" &&
        firstMember.content.length <= 200,
    );
    TestValidator.predicate(
      "member score is number",
      () => typeof firstMember.score === "number",
    );
    TestValidator.predicate(
      "member hit_count is non-negative integer",
      () =>
        typeof firstMember.hit_count === "number" && firstMember.hit_count >= 0,
    );
    TestValidator.predicate(
      "member created_at is valid datetime string",
      () =>
        typeof firstMember.created_at === "string" &&
        !isNaN(Date.parse(firstMember.created_at)),
    );
  }
}
