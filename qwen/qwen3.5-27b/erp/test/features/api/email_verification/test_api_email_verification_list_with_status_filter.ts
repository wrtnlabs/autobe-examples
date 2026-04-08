import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberEmailVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the email verification list endpoint with status-based filtering.
 *
 * Validates the email verification listing functionality by authenticating a member and querying verification records with different status filters (unused, used, expired). Ensures that the system correctly categorizes verification tokens based on their lifecycle state and returns proper pagination metadata.
 *
 * Special attention is given to verifying that the computed status field accurately reflects the token's lifecycle: unused when used_at is NULL and expired_at is in the future, used when used_at is NOT NULL, and expired when expired_at is in the past and used_at is NULL.
 *
 * 1. Authenticate a new member via join endpoint.
 * 2. Query email verifications with status filter "unused".
 * 3. Query email verifications with status filter "used".
 * 4. Query email verifications with status filter "expired".
 * 5. Validate response structure, pagination metadata, and record fields.
 */
export async function test_api_email_verification_list_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Query with status "unused"
  const unusedResult =
    await api.functional.hrmTimeTrack.member.email_verifications.index(
      memberConnection,
      {
        body: {
          status: "unused",
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackMemberEmailVerification.IRequest,
      },
    );
  typia.assert(unusedResult);
  // 3. Query with status "used"
  const usedResult =
    await api.functional.hrmTimeTrack.member.email_verifications.index(
      memberConnection,
      {
        body: {
          status: "used",
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackMemberEmailVerification.IRequest,
      },
    );
  typia.assert(usedResult);
  // 4. Query with status "expired"
  const expiredResult =
    await api.functional.hrmTimeTrack.member.email_verifications.index(
      memberConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackMemberEmailVerification.IRequest,
      },
    );
  typia.assert(expiredResult);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "unused pagination has valid current page",
    unusedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "used pagination has valid current page",
    usedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "expired pagination has valid current page",
    expiredResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "unused pagination has valid limit",
    unusedResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "used pagination has valid limit",
    usedResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "expired pagination has valid limit",
    expiredResult.pagination.limit > 0,
  );
  // 6. Validate record structure for unused verifications
  await ArrayUtil.asyncForEach(unusedResult.data, async (verification) => {
    typia.assert(verification);
    // Validate required fields exist
    TestValidator.predicate(
      "unused verification has valid id",
      verification.id !== undefined && verification.id.length > 0,
    );
    TestValidator.predicate(
      "unused verification has member info",
      verification.member !== undefined,
    );
    TestValidator.predicate(
      "unused verification has email",
      verification.email !== undefined && verification.email.length > 0,
    );
    TestValidator.predicate(
      "unused verification has token",
      verification.token !== undefined && verification.token.length > 0,
    );
    TestValidator.predicate(
      "unused verification has created_at",
      verification.created_at !== undefined,
    );
    TestValidator.predicate(
      "unused verification has expired_at",
      verification.expired_at !== undefined,
    );
    // Validate status computation: unused means used_at is null and expired_at is in future
    TestValidator.equals(
      "unused verification status is 'unused'",
      verification.status,
      "unused",
    );
    TestValidator.equals(
      "unused verification has null used_at",
      verification.used_at,
      null,
    );
    // Validate member summary structure
    typia.assert(verification.member);
    TestValidator.predicate(
      "unused verification member has id",
      verification.member.id !== undefined,
    );
    TestValidator.predicate(
      "unused verification member has email",
      verification.member.email !== undefined,
    );
  });
  // 7. Validate record structure for used verifications
  await ArrayUtil.asyncForEach(usedResult.data, async (verification) => {
    typia.assert(verification);
    // Validate required fields exist
    TestValidator.predicate(
      "used verification has valid id",
      verification.id !== undefined && verification.id.length > 0,
    );
    TestValidator.predicate(
      "used verification has member info",
      verification.member !== undefined,
    );
    TestValidator.predicate(
      "used verification has email",
      verification.email !== undefined && verification.email.length > 0,
    );
    TestValidator.predicate(
      "used verification has token",
      verification.token !== undefined && verification.token.length > 0,
    );
    // Validate status computation: used means used_at is not null
    TestValidator.equals(
      "used verification status is 'used'",
      verification.status,
      "used",
    );
    TestValidator.predicate(
      "used verification has non-null used_at",
      verification.used_at !== null,
    );
  });
  // 8. Validate record structure for expired verifications
  await ArrayUtil.asyncForEach(expiredResult.data, async (verification) => {
    typia.assert(verification);
    // Validate required fields exist
    TestValidator.predicate(
      "expired verification has valid id",
      verification.id !== undefined && verification.id.length > 0,
    );
    TestValidator.predicate(
      "expired verification has member info",
      verification.member !== undefined,
    );
    TestValidator.predicate(
      "expired verification has email",
      verification.email !== undefined && verification.email.length > 0,
    );
    TestValidator.predicate(
      "expired verification has token",
      verification.token !== undefined && verification.token.length > 0,
    );
    // Validate status computation: expired means used_at is null and expired_at is in past
    TestValidator.equals(
      "expired verification status is 'expired'",
      verification.status,
      "expired",
    );
    TestValidator.equals(
      "expired verification has null used_at",
      verification.used_at,
      null,
    );
  });
}
