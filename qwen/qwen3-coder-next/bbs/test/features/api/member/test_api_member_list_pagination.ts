import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default pagination (page: 1, limit: 20)
  const defaultResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", defaultResponse.pagination.limit, 20);
  TestValidator.predicate(
    "has records",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", defaultResponse.pagination.pages >= 0);
  // Verify data structure
  TestValidator.predicate(
    "has at least 1 member",
    defaultResponse.data.length >= 1,
  );
  TestValidator.predicate("members <= 20", defaultResponse.data.length <= 20);
  // Verify each member has required fields
  defaultResponse.data.forEach((member) => {
    TestValidator.predicate(
      "has id",
      member.id !== undefined && member.id !== null,
    );
    TestValidator.predicate(
      "has email",
      member.email !== undefined && member.email !== null,
    );
    TestValidator.predicate(
      "has display_name",
      member.display_name !== undefined && member.display_name !== null,
    );
    TestValidator.predicate("has is_active", member.is_active !== undefined);
    TestValidator.predicate("has is_admin", member.is_admin !== undefined);
    TestValidator.predicate(
      "has is_super_admin",
      member.is_super_admin !== undefined,
    );
    TestValidator.predicate(
      "has created_at",
      member.created_at !== undefined && member.created_at !== null,
    );
    TestValidator.predicate(
      "has updated_at",
      member.updated_at !== undefined && member.updated_at !== null,
    );
  });
  // Test 2: Pagination - request page 2
  if (defaultResponse.pagination.pages > 1) {
    const page2Response = await api.functional.discussionBoard.members.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
    typia.assert(page2Response);
    // Verify we got different results
    TestValidator.notEquals(
      "page 1 and page 2 are different",
      JSON.stringify(defaultResponse.data),
      JSON.stringify(page2Response.data),
    );
  }
  // Test 3: Verify only active members by default (no isActive filter)
  defaultResponse.data.forEach((member) => {
    TestValidator.equals("member is active", member.is_active, true);
  });
}
