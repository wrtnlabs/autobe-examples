import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberEmailVerification";
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
 * Test successful retrieval of an email verification record that has been used.
 *
 * Validates the primary success path for checking email verification status. This test ensures
 * that the system correctly returns complete verification record details when queried by
 * verification ID, including proper handling of used tokens and their associated timestamps.
 *
 * The test covers the complete verification lifecycle from member registration through
 * verification retrieval, ensuring all expected fields are properly populated and
 * that used verification records can be successfully queried.
 *
 * 1. Register a new member account with valid credentials, creating an initial
 *    email verification record.
 * 2. Retrieve the created email verification record using the verification ID.
 * 3. Validate all response fields are present and correctly formatted.
 * 4. Verify the verification status and timestamps are properly set.
 */
export async function test_api_customer_email_verification_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account - creates initial email verification record
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.ecommerceMall.auth.member.join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(joinResult);
  // 2. Generate a test email verification record with status='used'
  // Since we don't have an endpoint to create verification records directly,
  // we use the SDK's random data generation for the verification record structure
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  // Create verification record with used status (as if verification was completed)
  const verification: IEcommerceMallMemberEmailVerification = {
    id: verificationId,
    token: typia.random<string & tags.Format<"uuid">>(),
    email: joinResult.email,
    status: "used",
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    updated_at: new Date(Date.now() - 1000 * 30 * 60).toISOString(), // 30 mins ago
    used_at: new Date(Date.now() - 1000 * 30 * 60).toISOString(), // 30 mins ago
    expired_at: new Date(Date.now() + 1000 * 60 * 60 * 23).toISOString(), // 23 hours from now
    deleted_at: null,
    ecommerce_mall_member_id: joinResult.id,
  };
  // 3. Retrieve the email verification record
  const verificationConnection: api.IConnection = { host: connection.host };
  const retrievedVerification =
    await api.functional.ecommerceMall.member.email_verifications.at(
      verificationConnection,
      {
        verificationId,
      },
    );
  typia.assert(retrievedVerification);
  // 4. Validate the response
  TestValidator.equals(
    "verification ID matches",
    retrievedVerification.id,
    verificationId,
  );
  TestValidator.equals(
    "verification email matches",
    retrievedVerification.email,
    joinResult.email,
  );
  TestValidator.equals(
    "status is 'used'",
    retrievedVerification.status,
    "used",
  );
  TestValidator.equals(
    "member ID matches",
    retrievedVerification.ecommerce_mall_member_id,
    joinResult.id,
  );
  // Verify timestamps are properly set
  TestValidator.equals(
    "used_at is set",
    retrievedVerification.used_at !== null,
    true,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedVerification.deleted_at,
    null,
  );
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(retrievedVerification.expired_at) > new Date(),
  );
  // Verify all required fields are present
  TestValidator.predicate(
    "token is present",
    retrievedVerification.token.length > 0,
  );
  TestValidator.predicate(
    "created_at is present",
    retrievedVerification.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrievedVerification.updated_at !== undefined,
  );
}
