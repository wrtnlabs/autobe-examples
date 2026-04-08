import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberPasswordReset";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_tokens_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Test with no password reset tokens - should return empty
  const emptyResult =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      { body: {} },
    );
  typia.assert(emptyResult);
  TestValidator.equals("no tokens - empty data", emptyResult.data.length, 0);
  TestValidator.equals(
    "no tokens - zero records",
    emptyResult.pagination.records,
    0,
  );
  // 3. Test active status filter - request with no tokens should return empty
  const activeFilterResult =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      { body: { status: "active" } },
    );
  typia.assert(activeFilterResult);
  TestValidator.equals(
    "active filter - empty data",
    activeFilterResult.data.length,
    0,
  );
  // 4. Test expired status filter
  const expiredFilterResult =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      { body: { status: "expired" } },
    );
  typia.assert(expiredFilterResult);
  TestValidator.equals(
    "expired filter - empty data",
    expiredFilterResult.data.length,
    0,
  );
  // 5. Test used status filter
  const usedFilterResult =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      { body: { status: "used" } },
    );
  typia.assert(usedFilterResult);
  TestValidator.equals(
    "used filter - empty data",
    usedFilterResult.data.length,
    0,
  );
  // 6. Test date range filter combined with status
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateRangeFilterResult =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {
          createdAfter: oneWeekAgo.toISOString(),
          createdBefore: oneWeekLater.toISOString(),
        },
      },
    );
  typia.assert(dateRangeFilterResult);
  TestValidator.predicate(
    "date range filter - data length non-negative",
    dateRangeFilterResult.data.length >= 0,
  );
  // 7. Test pagination with status filter
  const paginationFilterResult =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      { body: { status: "active", page: 1, limit: 20 } },
    );
  typia.assert(paginationFilterResult);
  TestValidator.equals(
    "pagination - current page",
    paginationFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination - limit",
    paginationFilterResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination - records non-negative",
    paginationFilterResult.pagination.records >= 0,
  );
  // 8. Test combined filters: status with date range
  const combinedFilterResult =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "active",
          createdAfter: oneWeekAgo.toISOString(),
          createdBefore: oneWeekLater.toISOString(),
        },
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter - data length non-negative",
    combinedFilterResult.data.length >= 0,
  );
  // 9. Test invalid status filter - should throw error (400 Bad Request)
  await TestValidator.error(
    "invalid status filter - throws error",
    async () => {
      await api.functional.redditPlatform.member.password_resets.index(
        memberConnection,
        {
          body: { status: "invalid" as any },
        },
      );
    },
  );
  // 10. Test invalid date format - should throw error (400 Bad Request)
  await TestValidator.error("invalid date format - throws error", async () => {
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      {
        body: { createdAfter: "invalid-date" as any },
      },
    );
  });
}