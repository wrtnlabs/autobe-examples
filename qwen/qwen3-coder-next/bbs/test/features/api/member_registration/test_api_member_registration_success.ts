import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection for registration
  const registerConnection: api.IConnection = { host: connection.host };
  // Generate random member credentials
  const body = {
    // IDiscussionBoardMember.IJoin has no required fields currently
  } satisfies IDiscussionBoardMember.IJoin;
  // Register new member
  const output: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(registerConnection, {
      body,
    });
  typia.assert(output);
  // Validate response structure
  typia.assert<IAuthorizationToken>(output.token);
  // Verify access token exists and is non-empty
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  // Verify refresh token exists and is non-empty
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
  // Verify expiration timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "expired_at is valid datetime",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    output.token.refreshable_until.length > 0,
  );
  // Verify access token expires after current time
  const now = new Date();
  const expiredAt = new Date(output.token.expired_at);
  TestValidator.predicate("access token not expired", expiredAt > now);
  // Verify refresh token is valid for at least 24 hours
  const refreshableUntil = new Date(output.token.refreshable_until);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  TestValidator.predicate(
    "refresh token valid for at least 24 hours",
    refreshableUntil > oneDayFromNow,
  );
}
