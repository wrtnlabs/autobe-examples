import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_list_browsing_basic(
  connection: api.IConnection,
): Promise<void> {
  // Test member listing with default parameters (no filters, default pagination)
  const response = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {} satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(response);
  // Verify pagination metadata structure and calculations
  const pagination = response.pagination;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "records count non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    pagination.pages ===
      Math.max(0, Math.ceil(pagination.records / pagination.limit)),
  );
  // Verify data array structure
  typia.assert(response.data);
  for (const member of response.data) {
    typia.assert(member);
    // Verify id is valid UUID format
    typia.assert(member.id);
    // Verify username is non-empty string
    TestValidator.predicate(
      "username is non-empty string",
      member.username.length > 0,
    );
    // Verify karma is valid int32
    typia.assert(member.karma);
    // Verify created_at is valid date-time string
    typia.assert(member.created_at);
  }
  // Verify members are sorted by created_at descending (newest first)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].created_at).getTime();
      const currDate = new Date(response.data[i].created_at).getTime();
      TestValidator.predicate(
        `members sorted by created_at desc at index ${i}`,
        prevDate >= currDate,
      );
    }
  }
}
