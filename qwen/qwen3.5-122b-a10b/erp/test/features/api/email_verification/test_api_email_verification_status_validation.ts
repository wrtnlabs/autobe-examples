import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberEmailVerification";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_member_email_verifications_create } from "../../../generate/generate_random_hrm_member_member_email_verifications_create";
import { prepare_random_hrm_member_email_verification } from "../../../prepare/prepare_random_hrm_member_email_verification";

/**
 * Test email verification token status validation.
 *
 * Validates the email verification status endpoint returns complete token information including expiration and usage status. The test ensures the system correctly reports all status fields needed for frontend verification link validation, allowing users to determine if a verification link is still valid, expired, or already used.
 *
 * The verification record is returned with 200 OK regardless of token status (active, expired, or used), enabling the system to communicate specific status information to the user. All creation metadata and relationship data are properly included in the response.
 *
 * 1. Register a new member account with email, password, and session context (href, referrer, ip).
 * 2. Create an email verification token for the authenticated member.
 * 3. Retrieve the verification record using the verification ID.
 * 4. Validate response structure includes all required fields (id, token, email, expires_at, used_at, member, created_at, updated_at).
 * 5. Verify the member summary contains correct identification information matching the authenticated member.
 * 6. Confirm token fields are properly formatted (UUID for id, email format, ISO 8601 datetime).
 */
export async function test_api_email_verification_status_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create an email verification token
  const verification =
    await generate_random_hrm_member_member_email_verifications_create(
      memberConnection,
      {
        body: {} satisfies IHrmMemberEmailVerification.ICreate,
      },
    );
  typia.assert(verification);
  // 3. Retrieve the verification record by ID
  const retrieved =
    await api.functional.hrm.member.member.email_verifications.at(
      memberConnection,
      {
        verificationId: verification.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate business logic - verification record integrity
  TestValidator.equals(
    "verification ID matches",
    retrieved.id,
    verification.id,
  );
  TestValidator.equals("email matches", retrieved.email, verification.email);
  TestValidator.predicate("token is unused", retrieved.used_at === null);
  // 5. Verify member relationship data
  TestValidator.equals("member ID matches", retrieved.member.id, memberAuth.id);
  TestValidator.equals(
    "member email matches",
    retrieved.member.email,
    memberAuth.email,
  );
  TestValidator.predicate(
    "member account is active",
    retrieved.member.deleted_at === null,
  );
}
