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
export async function test_api_member_account_deletion_own_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an authenticated member account
  // We use authorize_member_join to create a new member and establish authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies DeepPartial<ITodoAppMember.IJoin>,
  });
  typia.assert(member);
  // Step 2: Delete the member's own account
  // The member deletes their own account using their member ID
  const deletedMember = await api.functional.todoApp.member.members.erase(
    memberConnection,
    {
      memberId: member.id,
    },
  );
  // Step 3: Validate the deleted member response
  // The response should contain the deleted member entity with confirmation details
  typia.assert(deletedMember);
  TestValidator.equals(
    "deleted member id matches original",
    deletedMember.id,
    member.id,
  );
}
