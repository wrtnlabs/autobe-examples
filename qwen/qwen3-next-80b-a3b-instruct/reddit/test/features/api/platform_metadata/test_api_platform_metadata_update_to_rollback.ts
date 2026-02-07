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

export async function test_api_platform_metadata_update_to_rollback(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Create a platform metadata record (deployment)
  // Since ICommunityPlatformMetadatum.IUpdate is empty, we can only pass an empty object
  const metadata =
    await api.functional.community.admin.platform_metadata.update(
      adminConnection,
      {
        metadataId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies ICommunityPlatformMetadatum.IUpdate,
      },
    );
  typia.assert(metadata);
  // 3. Validate that we received a valid empty metadata object
  // Since ICommunityPlatformMetadatum is empty, no properties can be validated
  // The only validation possible is that the response is not null/undefined and passes typia.assert
}
