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

export async function test_api_platform_metadata_retrieval_by_rollback_target_uuid(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(adminJoinResult);
  adminConnection.headers = { Authorization: adminJoinResult.token.access };
  const deploymentId = "c477d7a8-1c45-447e-977b-9e7b50f40f3c";
  const response =
    await api.functional.community.admin.platform_metadata.getByMetadataid(
      adminConnection,
      { metadataId: deploymentId },
    );
  typia.assert(response);
}
