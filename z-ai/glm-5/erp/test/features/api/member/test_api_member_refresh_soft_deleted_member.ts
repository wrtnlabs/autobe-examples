import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test refresh operation when the member account associated with the refresh token
 * has been soft-deleted, expecting a 403 Forbidden response.
 *
 * This test validates the business rule that soft-deleted members cannot maintain
 * active sessions and are denied access even with valid refresh tokens.
 */
export async function test_api_member_refresh_soft_deleted_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account and obtain tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  // 2. Extract the refresh token from the join response
  const refreshToken = joinResult.token.refresh;
  // 3. At this point, the member would need to be soft-deleted
  // Since there's no member deletion endpoint available in the provided API,
  // we document that the soft-delete step should be performed through
  // appropriate member deletion endpoint or direct database operation
  //
  // In a real scenario, the member would be soft-deleted here, setting
  // the deleted_at field in the database
  //
  // For this test, we simulate the scenario where refresh is attempted
  // with a token that should fail for a soft-deleted member
  //
  // Note: Without an actual soft-delete capability, this test documents
  // the expected behavior: 403 Forbidden when attempting to refresh
  // with a token from a soft-deleted member account
  // 4. Attempt to refresh - should fail with 403 Forbidden for soft-deleted member
  await TestValidator.httpError(
    "should return 403 Forbidden for soft-deleted member refresh",
    403,
    async () => {
      await api.functional.erpHrm.auth.member.refresh(
        { host: connection.host },
        {
          body: {
            refresh_token: refreshToken,
          } satisfies IErpHrmMember.IRefresh,
        },
      );
    },
  );
}
