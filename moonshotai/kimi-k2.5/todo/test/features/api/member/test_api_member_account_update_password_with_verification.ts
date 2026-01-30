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
export async function test_api_member_account_update_password_with_verification(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member connection and authenticate with known password
  const memberConnection: api.IConnection = { host: connection.host };
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      password: originalPassword,
    },
  });
  typia.assert(member);
  // Step 2: Update password with current password verification
  const newPassword = RandomGenerator.alphaNumeric(16);
  const updatedMember = await api.functional.todoApp.member.members.update(
    memberConnection,
    {
      memberId: member.id,
      body: {
        currentPassword: originalPassword,
        password: newPassword,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // Step 3: Verify member data integrity after password change
  TestValidator.equals("member id preserved", updatedMember.id, member.id);
  TestValidator.equals(
    "member email preserved",
    updatedMember.email,
    member.email,
  );
  // Step 4: Verify that wrong current password is rejected
  await TestValidator.error("wrong current password should fail", async () => {
    await api.functional.todoApp.member.members.update(memberConnection, {
      memberId: member.id,
      body: {
        currentPassword: "wrongPassword123",
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppMember.IUpdate,
    });
  });
}
