import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification record retrieval and structure validation.
 *
 * Creates a member account and retrieves an email verification record to validate
 * the response structure and data integrity. Since the member deletion endpoint
 * is not available in the provided SDK, cascade delete behavior verification would
 * require direct database manipulation.
 *
 * 1. Creates a test member account with randomized credentials
 * 2. Generates a random verification ID (simulating an existing verification record)
 * 3. Retrieves the email verification record using the verification ID
 * 4. Validates all required fields exist and have correct types
 * 5. Verifies the member relationship field structure (note: actual null behavior on
 *    member deletion requires cascade delete API)
 * 6. Validates token, email, and timestamp fields conform to expected formats
 *
 * Note: The cascade delete behavior (member=null when member is deleted) cannot be
 * tested without a member deletion endpoint. This would require either:
 * - A POST /multiUserTodo/auth/member/delete endpoint (not in SDK)
 * - Direct database manipulation
 * - Admin access to soft-delete the member account
 */
export async function test_api_member_email_verification_member_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account with valid credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string,
      password: RandomGenerator.alphaNumeric(12),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a random verification ID (simulating an existing verification record)
  // Note: In production, this ID would come from the member join response or a
  // separate verification creation endpoint which are not currently available
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string;
  // 3. Retrieve the email verification record
  // Note: Without a member deletion API, we test basic retrieval structure
  // The cascade delete test (member=null when deleted) would require direct DB access
  const verification =
    await api.functional.multiUserTodo.member_email_verifications.at(
      connection,
      { verificationId },
    );
  typia.assert(verification);
  // 4. Validate verification record ID matches requested ID
  TestValidator.equals(
    "verification ID matches request",
    verification.id,
    verificationId,
  );
  // 5. Validate required fields exist with correct types
  TestValidator.predicate(
    "verification has token",
    verification.token !== undefined,
  );
  TestValidator.predicate(
    "verification has email",
    verification.email !== undefined,
  );
  TestValidator.predicate(
    "verification has member_id",
    verification.member_id !== undefined,
  );
  TestValidator.predicate(
    "verification has expires_at",
    verification.expires_at !== undefined,
  );
  TestValidator.predicate(
    "verification has created_at",
    verification.created_at !== undefined,
  );
  TestValidator.predicate(
    "verification has updated_at",
    verification.updated_at !== undefined,
  );
  // 6. Validate member relationship structure
  // Note: member can be null when member account is deleted (cascade delete)
  // Currently member should exist since we just created it
  if (typia.is<IMultiUserTodoMember.ISummary>(verification.member!)) {
    typia.assert(verification.member);
    TestValidator.equals("member ID format", verification.member.id, member.id);
    TestValidator.equals(
      "member email format",
      verification.member.email,
      member.email,
    );
    TestValidator.equals(
      "member deleted_at is null (not deleted)",
      verification.member.deleted_at,
      null,
    );
  } else {
    TestValidator.equals(
      "member relationship is null or summary",
      verification.member,
      null,
    );
  }
  // 7. Validate timestamp consistency
  const expiresAt = new Date(verification.expires_at).getTime();
  const createdAt = new Date(verification.created_at).getTime();
  TestValidator.predicate(
    "expires_at is after created_at",
    expiresAt > createdAt,
  );
}
