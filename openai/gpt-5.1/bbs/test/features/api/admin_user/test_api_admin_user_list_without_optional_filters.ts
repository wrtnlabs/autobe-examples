import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminuser";

export async function test_api_admin_user_list_without_optional_filters(
  connection: api.IConnection,
) {
  // 1. Register first admin user (adminA)
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminA: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBodyA,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminA);

  // 2. Register second admin user (adminB)
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    bio: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminB: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBodyB,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminB);

  // 3. Call admin user listing API with minimal filters (only page, limit)
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestLimit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const listRequestBody = {
    page: requestPage,
    limit: requestLimit,
  } satisfies IDiscussionBoardAdminuser.IRequest;

  const pageResult: IPageIDiscussionBoardAdminuser.ISummary =
    await api.functional.discussionBoard.adminUser.adminUsers.index(
      connection,
      {
        body: listRequestBody,
      },
    );
  typia.assert<IPageIDiscussionBoardAdminuser.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  const summaries: IDiscussionBoardAdminuser.ISummary[] = pageResult.data;

  // 4. Basic pagination validations
  TestValidator.equals(
    "pagination.limit should match request limit",
    pagination.limit,
    requestLimit,
  );

  TestValidator.predicate(
    "pagination.records should be at least two admins",
    pagination.records >= 2,
  );

  TestValidator.predicate(
    "data length should be at least two admins",
    summaries.length >= 2,
  );

  // 5. Verify that both created admins appear in the results by email
  const emails = summaries.map((s) => s.email);

  TestValidator.predicate(
    "adminA email should be contained in result list",
    emails.includes(adminA.email),
  );

  TestValidator.predicate(
    "adminB email should be contained in result list",
    emails.includes(adminB.email),
  );

  // 6. Verify default ordering is consistent (assume created_at descending)
  const createdAtList = summaries.map((s) => s.created_at);

  await TestValidator.predicate(
    "created_at should be ordered descending",
    async () => {
      for (let i = 1; i < createdAtList.length; i++) {
        const prev = new Date(createdAtList[i - 1]).getTime();
        const curr = new Date(createdAtList[i]).getTime();
        if (prev < curr) return false;
      }
      return true;
    },
  );
}
