import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_system_config_non_admin_deletion_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
  } satisfies IRedditPlatformMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: memberData,
  });
  // 2. Login as the member to get authenticated session using utility function
  const loginData = {
    email: memberData.email,
    password: memberData.password,
  } satisfies IRedditPlatformMember.ILogin;
  await authorize_member_login(memberConnection, {
    body: loginData,
  });
  // 3. Attempt to delete a system configuration (should be forbidden)
  const configKey = typia.random<string>();
  await TestValidator.httpError(
    "non-admin deletion forbidden",
    403,
    async () => {
      await api.functional.redditPlatform.admin.system_configs.erase(
        memberConnection,
        { configKey },
      );
    },
  );
}
