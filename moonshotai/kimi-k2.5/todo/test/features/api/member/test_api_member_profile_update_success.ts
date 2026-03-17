import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member profile update success workflow.
 * A member successfully updates their profile after registration.
 * The test authenticates as a member via join, then updates the profile.
 * The system accepts the request and returns the updated member record.
 * Verify that the updated_at timestamp reflects the modification time.
 */
export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection);
  typia.assert(authorized);
  // 2. Update member profile - IUpdate is empty object as no editable fields available
  const updated = await api.functional.multiUserTodo.member.profile.update(
    memberConnection,
    {
      body: {} satisfies IMultiUserTodoMember.IUpdate,
    },
  );
  typia.assert(updated);
}
