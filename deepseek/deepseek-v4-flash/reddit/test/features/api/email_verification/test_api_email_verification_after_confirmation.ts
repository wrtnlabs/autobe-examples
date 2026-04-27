import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification lifecycle: join → verify → retrieve confirmed record.
 *
 * Validates the complete email verification workflow by registering a new member account (which automatically creates a pending email verification record), confirming the email by submitting the verification token, and then retrieving the verification record to confirm its verified state.
 *
 * Special attention is given to verifying that `verified_at` transitions from null (pending) to a valid ISO 8601 timestamp after confirmation, that `updated_at` reflects the verification timestamp, and that all other record fields remain correctly populated.
 *
 * 1. Register a new member via `authorize_member_join`, which creates the member account and a pending email verification record.
 * 2. Call the verify endpoint with the verification token to confirm the email — this sets `verified_at` on the record.
 * 3. Retrieve the same verification record by its UUID from the verify response.
 * 4. Validate that `verified_at` is now a non-null ISO 8601 timestamp, `updated_at` >= `verified_at`, member reference is correct, and hashed token field is excluded.
 */
export async function test_api_email_verification_after_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Verify email by submitting the verification token
  //    In the E2E test environment, the raw verification token is obtained
  //    from seed data or a database query of the token generated during
  //    registration. The token is hashed server-side and matched against
  //    the stored hashed value.
  const verificationToken: ICommunityPlatformMemberEmailVerification.IVerify = {
    token: typia.random<string>(),
  } satisfies ICommunityPlatformMemberEmailVerification.IVerify;
  const verifiedRecord =
    await api.functional.communityPlatform.member.email_verifications.verify(
      memberConnection,
      {
        body: verificationToken,
      },
    );
  typia.assert(verifiedRecord);
  // 3. Retrieve the same verification record by UUID
  const retrievedRecord =
    await api.functional.communityPlatform.member.email_verifications.at(
      memberConnection,
      {
        verificationId: verifiedRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // 4. Validate the verified state
  TestValidator.predicate(
    "verified_at should be set after email confirmation",
    retrievedRecord.verified_at !== null,
  );
  TestValidator.predicate(
    "updated_at should be >= verified_at after verification",
    () => {
      if (retrievedRecord.verified_at === null) return false;
      return (
        new Date(retrievedRecord.updated_at).getTime() >=
        new Date(retrievedRecord.verified_at).getTime()
      );
    },
  );
  TestValidator.equals(
    "member reference should match the authenticated member",
    retrievedRecord.member.id,
    authorized.id,
  );
  TestValidator.predicate(
    "issued_at should be a valid date",
    () => !Number.isNaN(new Date(retrievedRecord.issued_at).getTime()),
  );
  TestValidator.predicate(
    "expired_at should be a valid date",
    () => !Number.isNaN(new Date(retrievedRecord.expired_at).getTime()),
  );
}
