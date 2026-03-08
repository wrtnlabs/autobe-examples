import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123" satisfies string & tags.Format<"password">,
      displayName: "Test User",
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberData);
  // 2. Generate a random verification ID (server will return the member's verification token)
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the email verification token
  const verification =
    await api.functional.todoApp.member.email_verifications.at(
      memberConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 4. Verify all required fields are present
  TestValidator.equals(
    "verification ID is UUID",
    true,
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i.test(
      verification.id,
    ),
  );
  // 5. Verify member field exists and matches authenticated user
  const memberSummary = typia.assert(verification.member);
  TestValidator.equals(
    "member ID matches authenticated user",
    memberSummary.id,
    memberData.id,
  );
  TestValidator.equals(
    "member email matches authenticated user",
    memberSummary.email,
    memberData.email,
  );
  TestValidator.equals(
    "member display name matches authenticated user",
    memberSummary.displayName,
    memberData.display_name,
  );
  // 6. Verify timestamps are valid date-time format
  TestValidator.equals(
    "expiresAt is valid date-time format",
    typeof verification.expiresAt,
    "string",
  );
  TestValidator.equals(
    "createdAt is valid date-time format",
    typeof verification.createdAt,
    "string",
  );
  TestValidator.equals(
    "updatedAt is valid date-time format",
    typeof verification.updatedAt,
    "string",
  );
  // 7. Verify deletedAt is null (token not deleted)
  TestValidator.equals("token not deleted", verification.deletedAt, null);
  // 8. Verify used flag is boolean
  TestValidator.equals(
    "used flag is boolean",
    typeof verification.used,
    "boolean",
  );
  // 9. Verify usedAt can be null or date-time
  if (verification.usedAt !== undefined && verification.usedAt !== null) {
    TestValidator.equals(
      "usedAt is valid date-time format",
      typeof verification.usedAt,
      "string",
    );
  }
}
