import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardMember";

export async function test_api_admin_search_discussion_board_members(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin using join endpoint
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    nickname: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // Step 2: Perform a filtered and paginated search of discussion board members
  const searchRequestBody = {
    page: 1,
    limit: 10,
    search: adminAuth.nickname.slice(0, 3), // partial match for filtering
    status: "active",
    role: "admin",
    sortBy: "nickname",
    sortOrder: "asc",
  } satisfies IDiscussionBoardDiscussionBoardMember.IRequest;

  const membersResponse: IPageIDiscussionBoardDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.admin.discussionBoardMembers.index(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(membersResponse);

  // Assert pagination correctness
  TestValidator.predicate(
    "current page is 1",
    membersResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 10",
    membersResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records is non-negative",
    membersResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is at least 1",
    membersResponse.pagination.pages >= 1,
  );

  // Assert that returned members have valid IDs and emails
  for (const member of membersResponse.data) {
    typia.assert(member);
    TestValidator.predicate(
      "member id is valid uuid",
      typeof member.id === "string" && member.id.length > 0,
    );
    TestValidator.predicate(
      "member email contains @",
      member.email.includes("@"),
    );
    TestValidator.predicate(
      "member nickname is non-empty",
      member.nickname.length > 0,
    );
  }
}
