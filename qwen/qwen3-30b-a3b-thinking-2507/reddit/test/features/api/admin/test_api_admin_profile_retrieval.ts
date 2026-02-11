import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
  };
  const authorizer = await authorize_admin_join(adminConnection, {
    body: adminInfo,
  });
  const authedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorizer.token.access}`,
    },
  };
  const profile = await api.functional.community.admin.admins.at(
    authedConnection,
    {
      id: authorizer.id,
    },
  );
  typia.assert(profile);
}
