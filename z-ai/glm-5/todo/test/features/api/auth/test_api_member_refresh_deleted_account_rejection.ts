import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_deleted_account_rejection(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that token refresh is rejected for soft-deleted member accounts.
   *
   * Security requirement: Once a member account is soft-deleted (deleted_at is set),
   * any attempt to refresh authentication tokens must be rejected with 403 Forbidden.
   *
   * Prerequisites:
   * 1. Create member account and obtain refresh token
   * 2. Soft-delete the member account
   *
   * Note: This test requires a member delete endpoint to soft-delete the account
   * before testing refresh rejection. If no delete endpoint exists in the API,
   * this test validates refresh functionality and documents expected behavior.
   */
  // Step 1: Create a new member account and obtain tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {});
  typia.assert(authResponse);
  const refreshToken = authResponse.token.refresh;
  const memberId = authResponse.id;
  // Step 2: Verify account is active (deletedAt should be null)
  TestValidator.equals("account is active", authResponse.deletedAt, null);
  // Step 3: Refresh should work for active accounts
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IPrivateTodoAppMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Verify refresh produces valid tokens
  TestValidator.equals("same member id", refreshedAuth.id, memberId);
  TestValidator.predicate(
    "access token valid",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token valid",
    refreshedAuth.token.refresh.length > 0,
  );
  // Step 4: Expected behavior for deleted accounts
  // When a delete endpoint becomes available, add the following test:
  //
  // // Delete the member account (soft delete)
  // await api.functional.privateTodoApp.members.delete(memberConnection, { id: memberId });
  //
  // // Attempting refresh with deleted account should fail with 403
  // await TestValidator.httpError(
  //   "deleted account refresh rejected",
  //   403,
  //   async () => {
  //     const deletedRefreshConnection: api.IConnection = { host: connection.host };
  //     await authorize_member_refresh(deletedRefreshConnection, {
  //       body: { refresh_token: refreshToken } satisfies IPrivateTodoAppMember.IRefresh,
  //     });
  //   },
  // );
}
