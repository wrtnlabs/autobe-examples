import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_retrieval_unauthenticated(
  connection: api.IConnection,
): Promise<void> {
  // Create a fresh connection without any authorization headers
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Attempt to retrieve admin profile without authentication
  // Expect 401 Unauthorized error
  await TestValidator.httpError(
    "unauthenticated request returns 401",
    401,
    async () =>
      await api.functional.ecommerceMall.admin.admins.me.at(
        unauthenticatedConnection,
      ),
  );
}
