import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member email verification record retrieval.
 *
 * Validates that a member can retrieve their own email verification record by ID.
 * The test flow:
 * 1. Register a new member account (creates email verification record)
 * 2. Retrieve the verification record using the verification ID
 * 3. Validate the response structure and content
 * 4. Verify member summary is correctly associated
 * 5. Confirm record is not soft-deleted
 */
export async function test_api_email_verification_retrieve_own_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via registration
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Retrieve the email verification record
  // Use a valid UUID format for verification ID
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const verification =
    await api.functional.redditPlatform.member.email_verifications.at(
      memberConnection,
      { verificationId },
    );
  typia.assert(verification);
  // 3. Verify the response structure
  TestValidator.equals(
    "verification ID matches",
    verification.id,
    verificationId,
  );
  TestValidator.predicate("has token", verification.token.length > 0);
  TestValidator.predicate("has expires_at", verification.expires_at !== null);
  TestValidator.predicate(
    "verified_at is null for pending",
    verification.verified_at === null,
  );
  TestValidator.predicate("has created_at", verification.created_at !== null);
  TestValidator.predicate("has updated_at", verification.updated_at !== null);
  TestValidator.predicate(
    "deleted_at is null",
    verification.deleted_at === null,
  );
  // 4. Verify member summary is associated
  TestValidator.predicate("member is not null", verification.member !== null);
  // Type-safe member access after null check
  if (verification.member !== null) {
    const member = typia.assert(verification.member);
    TestValidator.equals(
      "member ID matches auth result",
      member.id,
      authResult.id,
    );
    TestValidator.equals(
      "username matches",
      member.username,
      authResult.username,
    );
    TestValidator.predicate(
      "member has karma_score",
      typeof member.karma_score === "number",
    );
    TestValidator.predicate(
      "member has created_at",
      member.created_at !== null,
    );
  }
}