import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test password reset token filtering by active status.
 *
 * Validates that the password reset token listing endpoint correctly filters results by token validity status. When the status filter is set to `"active"`, the response must contain only tokens whose expiration timestamp lies in the future according to the server's clock. Expired tokens — those whose `expired_at` has already passed — must be completely excluded from the result set.
 *
 * The pagination metadata must reflect the filtered count rather than any total across all statuses, ensuring the `records` field matches the number of tokens actually returned in the `data` array.
 *
 * 1. A new member registers and authenticates through the join flow to obtain an organization-scoped session.
 * 2. The member queries password reset tokens setting the status filter to `"active"`.
 * 3. Every returned token is verified to have a computed status of `"active"`.
 * 4. Pagination metadata is confirmed to be consistent with the returned data array length.
 */
export async function test_api_password_reset_token_filter_by_active_status(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Query password reset tokens with status filter
  const result = await api.functional.erpHrm.member.password_resets.index(
    memberConnection,
    {
      body: {
        status: "active",
      } satisfies IErpHrmMemberPasswordReset.IRequest,
    },
  );
  typia.assert(result);
  // 3. Verify all returned tokens have status "active"
  for (const token of result.data) {
    TestValidator.equals(
      "token status is active",
      token.status,
      "active" as const,
    );
  }
  // 4. Validate pagination reflects filtered count
  TestValidator.equals(
    "pagination records equals data length",
    result.pagination.records,
    result.data.length,
  );
}
