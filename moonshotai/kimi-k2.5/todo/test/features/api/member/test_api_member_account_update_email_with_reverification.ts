import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_account_update_email_with_reverification(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a new member using the utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const originalEmail = `original_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: originalEmail,
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      href: "https://example.com/todo/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(authorizedMember);
  // Step 2: Generate a new unique email address for the update
  const newEmail = `updated_${RandomGenerator.alphaNumeric(8)}@example.com`;
  // Step 3: Update the member's email address
  // This triggers the re-verification workflow as per business requirements
  const updatedMember = await api.functional.todoApp.member.members.update(
    memberConnection,
    {
      memberId: authorizedMember.id,
      body: {
        email: newEmail,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // Step 4: Validate the email was successfully updated
  TestValidator.equals(
    "email should be updated to the new value",
    updatedMember.email,
    newEmail,
  );
  // Step 5: Validate data integrity - other fields should remain unchanged
  TestValidator.equals(
    "member id should remain unchanged",
    updatedMember.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member name should remain unchanged",
    updatedMember.name,
    authorizedMember.name,
  );
}
