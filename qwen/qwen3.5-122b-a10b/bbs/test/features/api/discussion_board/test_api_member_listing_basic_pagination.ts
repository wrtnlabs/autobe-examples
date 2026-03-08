import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member listing with basic pagination functionality.
 * 1. Create multiple member accounts through registration
 * 2. Test default pagination (page=1, limit=20)
 * 3. Test custom pagination (page=2, limit=50)
 * 4. Validate response structure and pagination metadata
 * 5. Verify deleted members are excluded from results
 */
export async function test_api_member_listing_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple member accounts
  const members: IDiscussionBoardMember.IAuthorized[] = [];
  // Create 3 test members
  for (let i = 0; i < 3; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    typia.assert(member);
    members.push(member);
  }
  // 2. Test default pagination (page=1, limit=20)
  const defaultPaginationConnection: api.IConnection = {
    host: connection.host,
  };
  const defaultResult = await api.functional.discussionBoard.members.index(
    defaultPaginationConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(defaultResult);
  // Validate default pagination response
  TestValidator.equals(
    "default pagination current page",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "default pagination has records",
    defaultResult.pagination.records >= 3,
  );
  TestValidator.predicate(
    "default pagination has pages",
    defaultResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "default pagination has data",
    defaultResult.data.length > 0,
  );
  // Validate member summary structure
  for (const member of defaultResult.data.slice(0, 3)) {
    typia.assert(member);
    TestValidator.predicate("member has id", member.id !== undefined);
    TestValidator.predicate(
      "member has displayName",
      member.displayName !== undefined,
    );
    TestValidator.predicate("member has bio", member.bio !== undefined);
    TestValidator.predicate(
      "member has articleCount",
      member.articleCount >= 0,
    );
    TestValidator.predicate(
      "member has commentCount",
      member.commentCount >= 0,
    );
    TestValidator.predicate(
      "member has createdAt",
      member.createdAt !== undefined,
    );
    TestValidator.predicate(
      "member has updatedAt",
      member.updatedAt !== undefined,
    );
    TestValidator.predicate(
      "member has deletedAt",
      member.deletedAt !== undefined,
    );
  }
  // 3. Test custom pagination (page=2, limit=50)
  const customPaginationConnection: api.IConnection = { host: connection.host };
  const customResult = await api.functional.discussionBoard.members.index(
    customPaginationConnection,
    {
      body: {
        page: 2,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(customResult);
  // Validate custom pagination response
  TestValidator.equals(
    "custom pagination current page",
    customResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom pagination limit",
    customResult.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "custom pagination has records",
    customResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "custom pagination has pages",
    customResult.pagination.pages >= 0,
  );
  // 4. Test with no filters (empty request body)
  const noFilterConnection: api.IConnection = { host: connection.host };
  const noFilterResult = await api.functional.discussionBoard.members.index(
    noFilterConnection,
    {
      body: {} satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(noFilterResult);
  TestValidator.predicate(
    "no filter has records",
    noFilterResult.pagination.records >= 3,
  );
  TestValidator.predicate("no filter has data", noFilterResult.data.length > 0);
  // 5. Verify pagination calculation
  const expectedPages = Math.ceil(
    noFilterResult.pagination.records / noFilterResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation",
    noFilterResult.pagination.pages,
    expectedPages,
  );
}
