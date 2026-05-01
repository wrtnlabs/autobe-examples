import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification status filtering for a newly joined member.
 *
 * Validates that the email verification listing endpoint correctly derives
 * and filters by verification status (pending, verified, expired) from the
 * underlying verified_at and expires_at database columns. A pending token
 * has verified_at = null and expires_at in the future; a verified token has
 * verified_at populated; an expired token has verified_at = null and
 * expires_at in the past.
 *
 * 1. Create a new member via authorize_member_join, which automatically
 *    generates a pending email verification token.
 * 2. Query email verifications with status="pending" — the newly created
 *    token must appear with verified_at null and expires_at in the future.
 * 3. Query email verifications with status="verified" — results must be
 *    empty for a member who has not yet confirmed their email.
 */
export async function test_api_email_verification_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a new member — generates a pending email verification token
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Query pending verifications — should include the newly created token
  const pendingResult =
    await api.functional.erpHrm.member.email_verifications.index(
      memberConnection,
      {
        body: {
          status: "pending",
        } satisfies IErpHrmMemberEmailVerification.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending verifications should contain at least one record",
    pendingResult.data.length > 0,
  );
  TestValidator.predicate(
    "pending pagination records should be at least 1",
    pendingResult.pagination.records >= 1,
  );
  const pendingToken = pendingResult.data[0];
  TestValidator.equals(
    "pending token verified_at should be null",
    pendingToken.verified_at,
    null,
  );
  TestValidator.predicate(
    "pending token expires_at should be in the future",
    new Date(pendingToken.expires_at).getTime() > Date.now(),
  );
  // 3. Query verified verifications — should be empty for a new member
  const verifiedResult =
    await api.functional.erpHrm.member.email_verifications.index(
      memberConnection,
      {
        body: {
          status: "verified",
        } satisfies IErpHrmMemberEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedResult);
  TestValidator.equals(
    "verified verifications data should be empty",
    verifiedResult.data.length,
    0,
  );
  TestValidator.equals(
    "verified verifications pagination records should be 0",
    verifiedResult.pagination.records,
    0,
  );
}
