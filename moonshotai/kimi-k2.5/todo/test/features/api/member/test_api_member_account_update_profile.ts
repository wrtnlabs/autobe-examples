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
export async function test_api_member_account_update_profile(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member-specific connection and join/register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    },
  });
  typia.assert(authorizedMember);
  // Step 2: Update the member's profile name
  const newName = RandomGenerator.name();
  const updatedMember = await api.functional.todoApp.member.members.update(
    memberConnection,
    {
      memberId: authorizedMember.id,
      body: {
        name: newName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // Step 3: Validate that the name was updated correctly
  TestValidator.equals(
    "updated member name matches new name",
    updatedMember.name,
    newName,
  );
  TestValidator.equals(
    "member ID remains unchanged",
    updatedMember.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member email remains unchanged",
    updatedMember.email,
    authorizedMember.email,
  );
}
