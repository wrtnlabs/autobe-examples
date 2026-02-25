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

export async function test_api_feature_flag_admin_delete_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and establish authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate a random UUID that does not correspond to any existing feature flag
  const nonexistentFeatureFlagId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt DELETE operation with the non-existent UUID and verify 404 error
  await TestValidator.httpError(
    "delete non-existent feature flag should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.erase(
        adminConnection,
        {
          featureFlagId: nonexistentFeatureFlagId,
        },
      );
    },
  );
}
