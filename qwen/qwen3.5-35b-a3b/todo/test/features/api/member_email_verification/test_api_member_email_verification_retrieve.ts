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

export async function test_api_member_email_verification_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a test member account (this creates an email verification record)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate a random verification ID for the retrieval test
  // Note: In real E2E testing, we would need an endpoint to list verifications
  // to get the actual verification ID created during member registration.
  // For simulation mode, we use typia.random to generate a valid UUID.
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the email verification record
  const verificationConnection: api.IConnection = { host: connection.host };
  const verification =
    await api.functional.multiUserTodo.member_email_verifications.at(
      verificationConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 4. Validate response structure and content
  TestValidator.equals(
    "verification id format",
    verification.id,
    verificationId,
  );
  TestValidator.equals(
    "verification token exists",
    typeof verification.token,
    "string",
  );
  TestValidator.equals(
    "email is valid email",
    verification.email,
    memberAuth.email,
  );
  TestValidator.equals(
    "expires_at is date-time",
    typeof verification.expires_at,
    "string",
  );
  TestValidator.equals(
    "created_at is date-time",
    typeof verification.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is date-time",
    typeof verification.updated_at,
    "string",
  );
  TestValidator.equals(
    "member_id is UUID",
    verification.member_id,
    memberAuth.id,
  );
  // 5. Validate member relationship when member is active
  if (verification.member !== null && verification.member !== undefined) {
    typia.assert(verification.member);
    TestValidator.equals(
      "member id matches",
      verification.member.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "member email matches",
      verification.member.email,
      memberAuth.email,
    );
    TestValidator.equals(
      "member deleted_at is null",
      verification.member.deleted_at,
      null,
    );
  }
}
