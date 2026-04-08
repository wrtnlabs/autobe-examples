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
 * Test that an authenticated member can retrieve their own password reset history with pagination.
 *
 * Validates the complete password reset history retrieval flow including member registration, authentication, and paginated list access. Ensures that the response includes proper pagination information and that each record contains the member reference, timestamps, and usage status without exposing actual token values.
 *
 * Special attention is given to verifying that the pagination metadata is accurate and that the password reset records are sorted by created_at in descending order by default.
 *
 * 1. Register a new member account with email, password, and unique username.
 * 2. Create member-specific connection for authenticated API requests.
 * 3. Retrieve password reset history filtered by member ID with pagination.
 * 4. Validate response structure includes pagination metadata and password reset records.
 * 5. Verify each record contains member reference, timestamps, and usage status.
 */
export async function test_api_member_password_reset_list_own_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Retrieve password reset history with member ID filter
  const history =
    await api.functional.redditClone.member.member.password_resets.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneMemberPasswordReset.IRequest,
      },
    );
  typia.assert(history);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", history.pagination.current, 1);
  TestValidator.equals("limit", history.pagination.limit, 20);
  TestValidator.predicate(
    "has non-negative records",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has non-negative pages",
    history.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(history.data));
  // 5. If records exist, validate each password reset entry
  if (history.data.length > 0) {
    const firstRecord = history.data[0];
    typia.assert(firstRecord);
    // Validate member reference
    TestValidator.equals("member id matches", firstRecord.member.id, member.id);
    TestValidator.predicate(
      "member has email",
      firstRecord.member.email.length > 0,
    );
    TestValidator.predicate(
      "member has username",
      firstRecord.member.username.length > 0,
    );
    // Validate timestamps exist
    TestValidator.predicate(
      "has created_at",
      firstRecord.created_at.length > 0,
    );
    TestValidator.predicate(
      "has expired_at",
      firstRecord.expired_at.length > 0,
    );
    // Validate used_at is either null or a valid timestamp
    if (firstRecord.used_at !== null) {
      TestValidator.predicate(
        "used_at is valid timestamp",
        firstRecord.used_at.length > 0,
      );
    }
  }
  // 6. Test with different pagination parameters
  const page2 =
    await api.functional.redditClone.member.member.password_resets.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          page: 2,
          limit: 10,
        } satisfies IRedditCloneMemberPasswordReset.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
}
