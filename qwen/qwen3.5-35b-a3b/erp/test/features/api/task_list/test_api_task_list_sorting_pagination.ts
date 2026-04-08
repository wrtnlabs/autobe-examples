import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_list_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_description: RandomGenerator.paragraph(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberAuth);
  // Create member connection with token
  const memberApiConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Test default sorting (created_at ASC)
  const defaultSortResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberApiConnection, {
      body: {},
    });
  typia.assert(defaultSortResponse);
  TestValidator.predicate(
    "pagination current valid",
    defaultSortResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    defaultSortResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    defaultSortResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    defaultSortResponse.pagination.pages >= 0,
  );
  // 3. Test different sort options
  const sortOptions = [
    { sortBy: "created_at", sortOrder: "ASC" },
    { sortBy: "created_at", sortOrder: "DESC" },
    { sortBy: "updated_at", sortOrder: "ASC" },
    { sortBy: "due_date", sortOrder: "ASC" },
    { sortBy: "priority", sortOrder: "ASC" },
    { sortBy: "title", sortOrder: "ASC" },
  ] as const;
  for (const option of sortOptions) {
    const sortResponse = await api.functional.hrmPlatform.member.tasks.index(
      memberApiConnection,
      {
        body: {
          sortBy: option.sortBy,
          sortOrder: option.sortOrder,
        },
      },
    );
    typia.assert(sortResponse);
    TestValidator.predicate(
      `sort ${option.sortBy} ${option.sortOrder} returns valid pagination`,
      sortResponse.pagination.current > 0,
    );
  }
  // 4. Test pagination with limit
  const limitedResponse = await api.functional.hrmPlatform.member.tasks.index(
    memberApiConnection,
    {
      body: {
        limit: 10,
      },
    },
  );
  typia.assert(limitedResponse);
  TestValidator.predicate(
    "limit applied to response",
    limitedResponse.data.length <= 10,
  );
  TestValidator.equals(
    "limit matches pagination limit",
    limitedResponse.pagination.limit,
    10,
  );
  // 5. Test cursor-based pagination
  if (
    limitedResponse.pagination.current < limitedResponse.pagination.pages &&
    limitedResponse.data.length > 0
  ) {
    // Get cursor from last item of first page
    const lastItem = limitedResponse.data[limitedResponse.data.length - 1];
    TestValidator.predicate(
      "cursor pagination item has id",
      lastItem !== undefined,
    );
    // Use item id as cursor for second page
    const cursorResponse = await api.functional.hrmPlatform.member.tasks.index(
      memberApiConnection,
      {
        body: {
          cursor: lastItem.id,
          limit: 10,
        },
      },
    );
    typia.assert(cursorResponse);
    TestValidator.predicate(
      "cursor pagination returns valid data",
      cursorResponse.pagination.records >= 0,
    );
    TestValidator.equals(
      "cursor pagination current is 2",
      cursorResponse.pagination.current,
      2,
    );
  }
  // 6. Test combined filter + sort
  const filteredSortResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberApiConnection, {
      body: {
        status: "TODO",
        sortBy: "due_date",
        sortOrder: "ASC",
      },
    });
  typia.assert(filteredSortResponse);
  TestValidator.predicate(
    "filter + sort returns valid pagination",
    filteredSortResponse.pagination.records >= 0,
  );
  // 7. Test empty result pagination with valid filter that might have no results
  const emptyResultResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberApiConnection, {
      body: {
        status: "INVALID_STATUS",
      },
    });
  typia.assert(emptyResultResponse);
  TestValidator.equals(
    "empty result records is zero",
    emptyResultResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has no data",
    emptyResultResponse.data.length,
    0,
  );
  // 8. Test invalid sort field (should default to created_at ASC)
  const invalidSortResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberApiConnection, {
      body: {
        sortBy: "INVALID_FIELD",
      },
    });
  typia.assert(invalidSortResponse);
  TestValidator.predicate(
    "invalid sort defaults to valid pagination",
    invalidSortResponse.pagination.current > 0,
  );
}
