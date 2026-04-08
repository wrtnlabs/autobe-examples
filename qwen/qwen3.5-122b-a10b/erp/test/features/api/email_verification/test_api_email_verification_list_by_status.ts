import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberEmailVerification";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification listing with status-based filtering.
 *
 * Validates the email verification listing endpoint's ability to filter records by computed status (pending, used, expired). The test ensures that the status computation logic correctly identifies verification states based on used_at and expires_at fields, and that filtering returns only matching records.
 *
 * The test creates multiple email verification records with different states and verifies that filtering by each status returns the expected subset of records.
 *
 * 1. Register a new member account to create an initial pending email verification.
 * 2. Filter email verifications by status "pending" and verify the newly created verification is returned.
 * 3. Filter email verifications by status "used" and verify empty results (no used verifications exist yet).
 * 4. Filter email verifications by status "expired" and verify empty results (no expired verifications exist yet).
 * 5. Verify the response structure includes pagination metadata and verification summaries.
 */
export async function test_api_email_verification_list_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account to create an initial pending email verification
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Filter email verifications by status "pending"
  const pendingResult: IPageIHrmMemberEmailVerification.ISummary =
    await api.functional.hrm.member.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: memberAuth.id,
          status: "pending",
        } satisfies IHrmMemberEmailVerification.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Verify pending verifications exist for the newly registered member
  TestValidator.predicate(
    "pending verifications exist",
    pendingResult.data.length > 0,
  );
  TestValidator.predicate("all pending verifications have null used_at", () =>
    pendingResult.data.every((v) => v.used_at === null),
  );
  // 3. Filter email verifications by status "used"
  const usedResult: IPageIHrmMemberEmailVerification.ISummary =
    await api.functional.hrm.member.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: memberAuth.id,
          status: "used",
        } satisfies IHrmMemberEmailVerification.IRequest,
      },
    );
  typia.assert(usedResult);
  // Verify no used verifications exist yet (member just registered, not verified)
  TestValidator.predicate(
    "no used verifications yet",
    usedResult.data.length === 0,
  );
  // 4. Filter email verifications by status "expired"
  const expiredResult: IPageIHrmMemberEmailVerification.ISummary =
    await api.functional.hrm.member.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: memberAuth.id,
          status: "expired",
        } satisfies IHrmMemberEmailVerification.IRequest,
      },
    );
  typia.assert(expiredResult);
  // Verify no expired verifications exist yet (verification is fresh)
  TestValidator.predicate(
    "no expired verifications yet",
    expiredResult.data.length === 0,
  );
  // 5. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    pendingResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    pendingResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    pendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    pendingResult.pagination.pages >= 0,
  );
}
