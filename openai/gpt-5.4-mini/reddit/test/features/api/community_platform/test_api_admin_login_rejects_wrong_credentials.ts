import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_rejects_wrong_credentials(
  connection: api.IConnection,
): Promise<void> {
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const unknownEmailLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const wrongPasswordLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const password =
    "StrongP@ssw0rd1" satisfies ICommunityPlatformAdmin.IJoin["password"];
  const email = `admin-${typia.random<string & tags.Format<"uuid">>()}@example.com`;
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await TestValidator.error("rejects unknown admin email", async () => {
    await api.functional.communityPlatform.auth.admin.login(
      unknownEmailLoginConnection,
      {
        body: {
          email: `missing-${typia.random<string & tags.Format<"uuid">>()}@example.com`,
          password,
        } satisfies ICommunityPlatformAdmin.ILogin,
      },
    );
  });
  await TestValidator.error("rejects wrong admin password", async () => {
    await api.functional.communityPlatform.auth.admin.login(
      wrongPasswordLoginConnection,
      {
        body: {
          email,
          password: "DefinitelyWrongP@ssw0rd2",
        } satisfies ICommunityPlatformAdmin.ILogin,
      },
    );
  });
}
