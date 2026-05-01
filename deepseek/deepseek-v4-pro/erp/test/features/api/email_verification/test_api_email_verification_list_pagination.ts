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
 * Test paginated listing of email verification records for organization-scoped data isolation.
 *
 * Verifies that a newly joined member can retrieve a paginated list of email verification records within their organization. The member's own email verification token — automatically generated during sign-up — must appear in the results, confirming correct organization scoping and data isolation.
 *
 * The test validates pagination metadata integrity including current page, limit, total records, and total pages. Additionally, it confirms that the member's own verification record is in the pending state with a null verified_at timestamp and a future expires_at, matching the authorized member's email address.
 *
 * 1. Member joins via `authorize_member_join`, creating an account and authentication session.
 * 2. The email verification list is retrieved with randomized pagination parameters.
 * 3. Response structure is validated with `typia.assert`.
 * 4. Pagination metadata fields are asserted for correct types and reasonable values.
 * 5. The member's own verification record is located and validated for pending status.
 */
export async function test_api_email_verification_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Retrieve email verification list
  const page = await api.functional.erpHrm.member.email_verifications.index(
    memberConnection,
    {
      body: typia.random<IErpHrmMemberEmailVerification.IRequest>(),
    },
  );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 0",
    page.pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit >= 0", page.pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records >= 1",
    page.pagination.records >= 1,
  );
  TestValidator.predicate("pagination pages >= 1", page.pagination.pages >= 1);
  // 4. Validate data is not empty
  TestValidator.predicate(
    "data contains at least one record",
    page.data.length >= 1,
  );
  // 5. Validate the member's own verification exists
  const ownVerification = page.data.find((v) => v.member.id === authorized.id);
  TestValidator.predicate(
    "own verification record exists",
    ownVerification !== undefined,
  );
  // 6. Validate own verification structure and business logic
  TestValidator.predicate(
    "own verification email matches",
    ownVerification!.email === authorized.email,
  );
  TestValidator.predicate(
    "own verification is pending (verified_at null)",
    ownVerification!.verified_at === null,
  );
  TestValidator.predicate(
    "own verification expires in the future",
    new Date(ownVerification!.expires_at).getTime() > Date.now(),
  );
}
