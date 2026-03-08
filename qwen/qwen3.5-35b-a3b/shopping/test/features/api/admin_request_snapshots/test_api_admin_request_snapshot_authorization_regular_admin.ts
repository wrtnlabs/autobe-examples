import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_snapshot_authorization_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register regular administrator account
  const joinConnection: api.IConnection = { host: connection.host };
  const adminJoinCreds = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: (typia.random<string & tags.Format<"uri">>() as string & tags.Format<"uri">) || "",
    } satisfies IEcommerceMallAdmin.IJoin,
  };
  const adminAuthorized = await authorize_admin_join(
    joinConnection,
    adminJoinCreds,
  );
  typia.assert(adminAuthorized);
  // 2. Create admin-specific connection with authentication token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 3. Attempt to access admin request snapshots endpoint with regular admin
  // Expected: HTTP 403 Forbidden - super administrator privileges required
  await TestValidator.error(
    "regular admin should be forbidden from accessing admin request snapshots",
    async () => {
      await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
        adminConnection,
        {
          body: {
            page: 1,
            pageSize: 20,
          } satisfies IEcommerceMallAdminRequestSnapshot.IRequest,
        },
      );
    },
  );
}