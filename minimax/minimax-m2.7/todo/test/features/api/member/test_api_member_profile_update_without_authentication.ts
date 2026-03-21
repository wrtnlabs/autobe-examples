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

export async function test_api_member_profile_update_without_authentication(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection without authentication headers
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Attempt to update profile without authentication - should fail with 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated profile update should return 401",
    401,
    async () =>
      await api.functional.multiUserTodo.member.profile.update(
        unauthenticatedConnection,
        {
          body: {
            display_name: "Unauthorized Update Attempt",
          } satisfies IMultiUserTodoMember.IUpdate,
        },
      ),
  );
}
