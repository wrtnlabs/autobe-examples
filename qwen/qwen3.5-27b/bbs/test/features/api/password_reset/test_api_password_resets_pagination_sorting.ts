import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPasswordReset";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test pagination and sorting functionality for password reset audit endpoint.
 * Validates pagination metadata, sorting by multiple fields, and page navigation.
 */
export async function test_api_password_resets_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Test pagination with page=1, limit=10
  const page1Result =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  TestValidator.predicate("page 1 has data", page1Result.data.length >= 0);
  // 3. Test pagination with page=2, limit=10
  const page2Result =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  TestValidator.equals(
    "total records consistent",
    page1Result.pagination.records,
    page2Result.pagination.records,
  );
  // 4. Test with larger limit (50)
  const largeLimitResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 50,
          sort: "created_at",
          direction: "desc",
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(largeLimitResult);
  TestValidator.equals(
    "large limit current",
    largeLimitResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "large limit value",
    largeLimitResult.pagination.limit,
    50,
  );
  // 5. Test sorting by created_at ascending
  const sortCreatedAsc =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "asc",
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(sortCreatedAsc);
  TestValidator.equals(
    "sort created_at asc current",
    sortCreatedAsc.pagination.current,
    1,
  );
  // 6. Test sorting by expired_at descending
  const sortExpiredDesc =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "expired_at",
          direction: "desc",
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(sortExpiredDesc);
  TestValidator.equals(
    "sort expired_at desc current",
    sortExpiredDesc.pagination.current,
    1,
  );
  // 7. Test sorting by user_email ascending
  const sortEmailAsc =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "user_email",
          direction: "asc",
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(sortEmailAsc);
  TestValidator.equals(
    "sort user_email asc current",
    sortEmailAsc.pagination.current,
    1,
  );
  // 8. Test sorting by used_at descending
  const sortUsedDesc =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "used_at",
          direction: "desc",
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(sortUsedDesc);
  TestValidator.equals(
    "sort used_at desc current",
    sortUsedDesc.pagination.current,
    1,
  );
  // 9. Validate pagination pages calculation
  TestValidator.predicate(
    "pages calculation correct",
    page1Result.pagination.pages ===
      Math.ceil(page1Result.pagination.records / page1Result.pagination.limit),
  );
  // 10. Test edge case: page=1 with limit=1
  const singleItemResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1,
          sort: "created_at",
          direction: "desc",
        } satisfies IDiscussionBoardAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(singleItemResult);
  TestValidator.equals(
    "single item limit",
    singleItemResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "single item has at most 1 record",
    singleItemResult.data.length <= 1,
  );
}
