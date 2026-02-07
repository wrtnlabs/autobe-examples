import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_user_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a valid member first to ensure the system has valid users
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Prepare non-existent login credentials
  const loginInput = typia.random<IDiscussionBoardMember.ILogin>();
  // Attempt to login with non-existent user
  await TestValidator.error("user not found error", async () => {
    const loginConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(loginConnection, {
      body: loginInput,
    });
  });
}
