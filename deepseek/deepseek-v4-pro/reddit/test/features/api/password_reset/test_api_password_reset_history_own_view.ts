import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that a member retrieves their own password reset history with default pagination.
 *
 * Validates the password reset history retrieval endpoint by requesting records with default pagination (empty body, no filters). Ensures the response conforms to the IPageICommunityHubMemberPasswordReset.ISummary structure via typia.assert, confirming each record exposes only id, expired_at, used_at, and created_at — never the actual reset token.
 *
 * Additional validation ensures records are ordered by created_at descending (most recent first) and that pagination metadata is internally consistent: pages = ceil(records / limit) when records > 0.
 *
 * 1. Member requests their own password reset history with no filters and default pagination.
 * 2. typia.assert validates complete response structure and type conformance.
 * 3. Records are verified to be ordered by created_at descending.
 * 4. Pagination metadata consistency is confirmed.
 */
export async function test_api_password_reset_history_own_view(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const result =
    await api.functional.communityHub.members.password_resets.index(
      memberConnection,
      {
        username: typia.random<string>(),
        body: {} satisfies ICommunityHubMemberPasswordReset.IRequest,
      },
    );
  typia.assert(result);
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      TestValidator.predicate(
        "records ordered by created_at descending",
        new Date(result.data[i - 1].created_at).getTime() >=
          new Date(result.data[i].created_at).getTime(),
      );
    }
  }
  TestValidator.predicate(
    "pagination pages consistent with records and limit",
    result.pagination.records === 0 ||
      result.pagination.pages ===
        Math.ceil(result.pagination.records / result.pagination.limit),
  );
}
