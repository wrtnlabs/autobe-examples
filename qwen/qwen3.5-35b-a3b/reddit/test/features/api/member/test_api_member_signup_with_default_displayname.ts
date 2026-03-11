import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_signup_with_default_displayname(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate registration data without displayName
  const username = RandomGenerator.alphaNumeric(10);
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPass123";
  // 2. Join without displayName
  const result = await authorize_member_join(connection, {
    body: {
      email,
      username,
      password,
      // displayName intentionally omitted to test default behavior
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(result);
  // 3. Verify display_name defaults to username (main test case)
  TestValidator.equals(
    "display_name should default to username",
    result.user.display_name,
    username,
  );
  // 4. Verify other profile fields are correctly set
  TestValidator.equals(
    "username matches input",
    result.user.username,
    username,
  );
  // 5. Verify business logic fields
  TestValidator.predicate(
    "has valid karma score (non-negative)",
    result.user.karma_score >= 0,
  );
  TestValidator.predicate(
    "account is active by default",
    result.user.is_active === true,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    result.user.created_at !== undefined,
  );
  TestValidator.equals(
    "session has valid summary structure",
    result.sessions.length > 0,
    true,
  );
  TestValidator.equals(
    "access token is present",
    result.access !== undefined && result.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token is present",
    result.refresh !== undefined && result.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "expired_at is valid date format",
    result.expired_at !== undefined && result.expired_at !== null,
    true,
  );
  TestValidator.equals(
    "token has access and refresh",
    result.token.access !== undefined && result.token.refresh !== undefined,
    true,
  );
}
