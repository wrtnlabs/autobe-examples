import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminPasswordReset";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Test basic retrieval without filters
  const basicResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(basicResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    basicResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", basicResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    basicResult.pagination.pages >= 0,
  );
  // 3. Test filtering by type (member)
  const memberTypeResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          type: "member",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(memberTypeResult);
  TestValidator.equals(
    "member type filter pagination",
    memberTypeResult.pagination.current,
    1,
  );
  // 4. Test filtering by type (admin)
  const adminTypeResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          type: "admin",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(adminTypeResult);
  TestValidator.equals(
    "admin type filter pagination",
    adminTypeResult.pagination.current,
    1,
  );
  // 5. Test filtering by status (active)
  const activeStatusResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(activeStatusResult);
  TestValidator.equals(
    "active status filter pagination",
    activeStatusResult.pagination.current,
    1,
  );
  // 6. Test filtering by status (used)
  const usedStatusResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "used",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(usedStatusResult);
  TestValidator.equals(
    "used status filter pagination",
    usedStatusResult.pagination.current,
    1,
  );
  // 7. Test filtering by status (expired)
  const expiredStatusResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(expiredStatusResult);
  TestValidator.equals(
    "expired status filter pagination",
    expiredStatusResult.pagination.current,
    1,
  );
  // 8. Test filtering by search text
  const searchResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          search: RandomGenerator.alphabets(5),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search filter pagination",
    searchResult.pagination.current,
    1,
  );
  // 9. Test filtering by date ranges (created_at)
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtTo = now.toISOString();
  const createdAtResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          created_at_from: createdAtFrom,
          created_at_to: createdAtTo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(createdAtResult);
  TestValidator.equals(
    "created_at filter pagination",
    createdAtResult.pagination.current,
    1,
  );
  // 10. Test filtering by date ranges (expires_at)
  const expiresAtFrom = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const expiresAtTo = new Date(
    now.getTime() + 48 * 60 * 60 * 1000,
  ).toISOString();
  const expiresAtResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          expires_at_from: expiresAtFrom,
          expires_at_to: expiresAtTo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(expiresAtResult);
  TestValidator.equals(
    "expires_at filter pagination",
    expiresAtResult.pagination.current,
    1,
  );
  // 11. Test combined filters (type + status)
  const combinedResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          type: "member",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter pagination",
    combinedResult.pagination.current,
    1,
  );
  // 12. Test combined filters (search + date ranges)
  const complexFilterResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          search: RandomGenerator.alphabets(3),
          created_at_from: createdAtFrom,
          created_at_to: createdAtTo,
          expires_at_from: expiresAtFrom,
          expires_at_to: expiresAtTo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(complexFilterResult);
  TestValidator.equals(
    "complex filter pagination",
    complexFilterResult.pagination.current,
    1,
  );
  // 13. Test pagination with different page numbers
  const page2Result =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 pagination", page2Result.pagination.current, 2);
  // 14. Test pagination with different limit values
  const limit20Result =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(limit20Result);
  TestValidator.equals(
    "limit 20 pagination",
    limit20Result.pagination.limit,
    20,
  );
  // 15. Validate response data structure (if data exists)
  if (basicResult.data.length > 0) {
    const firstRecord = basicResult.data[0];
    typia.assert(firstRecord);
    // Validate admin summary structure exists
    typia.assert(firstRecord.admin);
    TestValidator.equals(
      "admin has id",
      firstRecord.admin.id,
      firstRecord.admin.id,
    );
    TestValidator.equals(
      "admin has display_name",
      firstRecord.admin.display_name,
      firstRecord.admin.display_name,
    );
    TestValidator.equals(
      "admin has grade",
      firstRecord.admin.grade,
      firstRecord.admin.grade,
    );
  }
  // 16. Test edge case: empty result set with pagination
  const edgeCaseResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          search: "zzzzz_nonexistent_search_term",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(edgeCaseResult);
  TestValidator.equals(
    "edge case pagination current",
    edgeCaseResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "edge case records count",
    edgeCaseResult.pagination.records >= 0,
  );
}
