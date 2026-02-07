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
import { generate_random_community_admin_platform_metadata_create } from "../../../generate/generate_random_community_admin_platform_metadata_create";
import { prepare_random_community_platform_metadatum } from "../../../prepare/prepare_random_community_platform_metadatum";

export async function test_api_deployment_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Create platform deployment record
  const deploymentRaw =
    await generate_random_community_admin_platform_metadata_create(
      adminConnection,
      {
        body: {
          version: "v2.5.0",
          environment: "production",
          checksum:
            "aabbccddeeff11223344556677889900aabbccddeeff11223344556677889900",
          changelog_url: "https://example.com/changelog/v2.5.0",
        },
      },
    );
  const deployment = typia.assert<any>(deploymentRaw);
  // 3. Validate response fields
  TestValidator.predicate("has valid UUID", deployment.id !== undefined);
  TestValidator.predicate(
    "has valid timestamp",
    deployment.created_at !== undefined && deployment.created_at !== null,
  );
  TestValidator.predicate(
    "has valid timestamp",
    deployment.updated_at !== undefined && deployment.updated_at !== null,
  );
}