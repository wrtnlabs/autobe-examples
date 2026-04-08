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
 * Test successful email verification record retrieval by verification ID.
 *
 * Validates the complete email verification token lifecycle from creation to retrieval. A member registers, creates an email verification token, then successfully retrieves the verification record to confirm all expected fields are present and the token is in a valid, unused state.
 *
 * The test ensures the verification endpoint correctly returns the full verification entity with proper member context, token information, and timestamps. It verifies that newly created tokens have used_at as null, indicating they are available for verification.
 *
 * 1. Register a new member account with email and password.
 * 2. Create an email verification token for the member.
 * 3. Retrieve the verification record by its ID.
 * 4. Validate all response fields are present and correctly typed.
 * 5. Verify used_at is null (token is unused and valid).
 * 6. Confirm member information matches the registered account.
 */
export async function test_api_email_verification_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Create an email verification token
  const verification: IHrmMemberEmailVerification =
    await generate_random_hrm_member_member_email_verifications_create(
      memberConnection,
      {
        body: {} satisfies IHrmMemberEmailVerification.ICreate,
      },
    );
  typia.assert(verification);
  // 3. Retrieve the verification record by ID
  const retrieved: IHrmMemberEmailVerification =
    await api.functional.hrm.member.member.email_verifications.at(
      memberConnection,
      {
        verificationId: verification.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate all response fields are present and correctly typed
  TestValidator.equals(
    "verification ID matches",
    retrieved.id,
    verification.id,
  );
  TestValidator.equals("token matches", retrieved.token, verification.token);
  TestValidator.equals("email matches", retrieved.email, verification.email);
  TestValidator.equals("member ID matches", retrieved.member.id, memberAuth.id);
  TestValidator.equals(
    "member email matches",
    retrieved.member.email,
    memberAuth.email,
  );
  // 5. Verify used_at is null (token is unused and valid)
  TestValidator.equals("token is unused", retrieved.used_at, null);
  // 6. Confirm expiration timestamp is in the future
  const now = new Date();
  const expiresAt = new Date(retrieved.expires_at);
  TestValidator.predicate("token not expired", expiresAt > now);
}
