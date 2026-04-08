import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberPasswordReset";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberPasswordReset";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering password reset records by token usage status (used vs unused).
 *
 * Validates that the password reset listing endpoint correctly filters records based on token consumption status. When filtering by status='used', only password reset tokens that have been consumed (used_at is not null) should be returned. When filtering by status='unused', only tokens that are still valid and available for password reset (used_at is null) should be returned.
 *
 * This test ensures that members can audit their password reset history and identify which reset attempts were successful versus which tokens are still available for use.
 *
 * 1. Authenticate a new member account.
 * 2. Retrieve password reset records filtered by status='used'.
 * 3. Validate that all returned records have used_at set (consumed tokens).
 * 4. Retrieve password reset records filtered by status='unused'.
 * 5. Validate that all returned records have used_at as null (available tokens).
 * 6. Verify pagination metadata is correct for both filtered results.
 */
export async function test_api_member_password_reset_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Filter by status='used' - should return only consumed tokens
  const usedResets =
    await api.functional.redditClone.member.member.password_resets.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          status: "used",
          page: 1,
          limit: 100,
        } satisfies IRedditCloneMemberPasswordReset.IRequest,
      },
    );
  typia.assert(usedResets);
  // 3. Validate all 'used' records have used_at set
  for (const reset of usedResets.data) {
    typia.assert(reset);
    TestValidator.predicate(
      `used token has used_at set for reset ${reset.id}`,
      reset.used_at !== null,
    );
  }
  // 4. Filter by status='unused' - should return only available tokens
  const unusedResets =
    await api.functional.redditClone.member.member.password_resets.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          status: "unused",
          page: 1,
          limit: 100,
        } satisfies IRedditCloneMemberPasswordReset.IRequest,
      },
    );
  typia.assert(unusedResets);
  // 5. Validate all 'unused' records have used_at as null
  for (const reset of unusedResets.data) {
    typia.assert(reset);
    TestValidator.equals(
      `unused token has used_at as null for reset ${reset.id}`,
      reset.used_at,
      null,
    );
  }
  // 6. Verify pagination metadata is correct
  TestValidator.predicate(
    "used resets pagination has valid current page",
    usedResets.pagination.current >= 1,
  );
  TestValidator.predicate(
    "unused resets pagination has valid current page",
    unusedResets.pagination.current >= 1,
  );
  TestValidator.predicate(
    "used resets pagination has valid limit",
    usedResets.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "unused resets pagination has valid limit",
    unusedResets.pagination.limit >= 1,
  );
}
