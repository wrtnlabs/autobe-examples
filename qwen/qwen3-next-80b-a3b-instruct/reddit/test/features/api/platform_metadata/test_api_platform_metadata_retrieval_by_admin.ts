import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityPlatformMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_platform_metadata_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration: Join platform to establish admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Retrieve platform metadata
  const metadata =
    await api.functional.community.admin.platform_metadata.patch(
      adminConnection,
    );
  typia.assert(metadata);
  // 3. Validation: Confirm the returned object is of type ICommunityPlatformMetadatum
  // Note: Type validation is complete via typia.assert, so no redundant checks needed
  // The metadata is verified as the latest success record by the system logic;
  // test validates only that the endpoint returns a valid ICommunityPlatformMetadatum object.
}
