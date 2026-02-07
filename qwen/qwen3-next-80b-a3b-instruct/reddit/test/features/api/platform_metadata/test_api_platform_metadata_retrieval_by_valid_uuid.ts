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

export async function test_api_platform_metadata_retrieval_by_valid_uuid(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new admin to get authorization
  const joinInput: ICommunityAdmin.IJoin =
    typia.random<ICommunityAdmin.IJoin>();
  await authorize_admin_join(adminConnection, { body: joinInput });
  // Step 2: Generate a valid UUID
  const metadataId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the platform metadata by valid UUID
  const fetchedMetadata =
    await api.functional.community.admin.platform_metadata.getByMetadataid(
      adminConnection,
      { metadataId },
    );
  // Step 4: Validate the response conforms to the schema: empty object
  typia.assert(fetchedMetadata);
}
