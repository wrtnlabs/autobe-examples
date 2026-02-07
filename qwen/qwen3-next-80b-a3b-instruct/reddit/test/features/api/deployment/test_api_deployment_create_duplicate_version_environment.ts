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

export async function test_api_deployment_create_duplicate_version_environment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Create first valid deployment
  const firstDeployment =
    await generate_random_community_admin_platform_metadata_create(
      adminConnection,
      {
        body: {
          version: "v2.5.0",
          environment: "production",
          checksum: typia.random<string & tags.Pattern<"^[a-f0-9]{64}$">>(),
          changelog_url: "https://example.com/changelog-v2.5.0",
        } satisfies ICommunityPlatformMetadatum.ICreate,
      },
    );
  typia.assert(firstDeployment);
  // 3. Attempt to create duplicate deployment (same version and environment)
  await TestValidator.error("duplicate version and environment", async () => {
    await generate_random_community_admin_platform_metadata_create(
      adminConnection,
      {
        body: {
          version: "v2.5.0", // Same version as first deployment
          environment: "production", // Same environment as first deployment
          checksum: typia.random<string & tags.Pattern<"^[a-f0-9]{64}$">>(),
          changelog_url: "https://example.com/changelog-v2.5.0-duplicate",
        } satisfies ICommunityPlatformMetadatum.ICreate,
      },
    );
  });
}
