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
 * Test filtering password reset records by expiration status for authenticated members.
 *
 * Validates that members can search their password reset history with expiration status filtering. When filtering by expired=true, only tokens with expired_at in the past should be returned. When filtering by expired=false, only tokens with expired_at in the future should be returned. The test verifies correct timestamp comparison logic and response structure.
 *
 * Special attention is given to ensuring the expiration status is computed correctly by comparing expired_at with the current server time, and that the response accurately reflects tokens that are either expired or still valid for use.
 *
 * 1. Authenticate as a new member account.
 * 2. Search password reset records with expired=true filter.
 * 3. Validate response structure and that any returned tokens have expired_at in the past.
 * 4. Search password reset records with expired=false filter.
 * 5. Validate response structure and that any returned tokens have expired_at in the future.
 * 6. Verify pagination metadata is present and valid.
 */
export async function test_api_member_password_reset_filter_by_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Search with expired=true filter
  const expiredResult =
    await api.functional.redditClone.member.member.password_resets.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          expired: true,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneMemberPasswordReset.IRequest,
      },
    );
  typia.assert(expiredResult);
  // 3. Validate expired tokens have expired_at in the past (if any exist)
  const now = new Date();
  for (const reset of expiredResult.data) {
    TestValidator.predicate(
      `expired token ${reset.id} has expired_at in the past`,
      new Date(reset.expired_at) < now,
    );
  }
  // 4. Search with expired=false filter
  const validResult =
    await api.functional.redditClone.member.member.password_resets.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          expired: false,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneMemberPasswordReset.IRequest,
      },
    );
  typia.assert(validResult);
  // 5. Validate valid tokens have expired_at in the future (if any exist)
  for (const reset of validResult.data) {
    TestValidator.predicate(
      `valid token ${reset.id} has expired_at in the future`,
      new Date(reset.expired_at) >= now,
    );
  }
  // 6. Verify pagination metadata is present and valid
  TestValidator.equals(
    "expired filter pagination current page",
    expiredResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "valid filter pagination current page",
    validResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "expired filter has non-negative records",
    expiredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "valid filter has non-negative records",
    validResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "expired filter has valid limit",
    expiredResult.pagination.limit === 20,
  );
  TestValidator.predicate(
    "valid filter has valid limit",
    validResult.pagination.limit === 20,
  );
}
