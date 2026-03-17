import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberPasswordReset";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_history_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as a member using the join endpoint
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Test password reset history retrieval with pagination parameters
  const requestWithPagination = {
    page: 1,
    limit: 10,
  } satisfies IRedditLikeMemberPasswordReset.IRequest;
  const paginatedResult =
    await api.functional.redditLike.member.password_resets.index(
      memberConnection,
      { body: requestWithPagination },
    );
  typia.assert(paginatedResult);
  // 3. Verify pagination structure
  typia.assert(paginatedResult.pagination);
  typia.assert(paginatedResult.data);
  // 4. Test with date range filters
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const requestWithDateFilters = {
    page: 1,
    limit: 20,
    createdAtFrom: oneWeekAgo.toISOString(),
    createdAtTo: oneWeekFromNow.toISOString(),
  } satisfies IRedditLikeMemberPasswordReset.IRequest;
  const filteredByDateResult =
    await api.functional.redditLike.member.password_resets.index(
      memberConnection,
      { body: requestWithDateFilters },
    );
  typia.assert(filteredByDateResult);
  // 5. Test with status filters
  const statuses = ["PENDING", "USED", "EXPIRED"] as const;
  for (const status of statuses) {
    const requestWithStatus = {
      page: 1,
      limit: 30,
      status,
    } satisfies IRedditLikeMemberPasswordReset.IRequest;
    const filteredByStatusResult =
      await api.functional.redditLike.member.password_resets.index(
        memberConnection,
        { body: requestWithStatus },
      );
    typia.assert(filteredByStatusResult);
  }
  // 6. Test combined filters
  const requestWithCombinedFilters = {
    page: 1,
    limit: 50,
    createdAtFrom: oneWeekAgo.toISOString(),
    createdAtTo: oneWeekFromNow.toISOString(),
    status: "PENDING",
  } satisfies IRedditLikeMemberPasswordReset.IRequest;
  const combinedFilterResult =
    await api.functional.redditLike.member.password_resets.index(
      memberConnection,
      { body: requestWithCombinedFilters },
    );
  typia.assert(combinedFilterResult);
  // 7. Verify each password reset summary in the response has the expected structure
  if (combinedFilterResult.data.length > 0) {
    for (const resetSummary of combinedFilterResult.data) {
      typia.assert(resetSummary);
    }
  }
}
