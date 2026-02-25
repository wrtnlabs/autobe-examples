import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_system_snapshots_create } from "../../../generate/generate_random_community_platform_admin_system_snapshots_create";
import { prepare_random_community_platform_system_snapshot } from "../../../prepare/prepare_random_community_platform_system_snapshot";

export async function test_api_system_snapshot_create_comprehensive_daily_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Create comprehensive daily system snapshot using utility function
  const snapshot =
    await generate_random_community_platform_admin_system_snapshots_create(
      adminConnection,
      {
        body: {
          snapshot_period: "daily",
          snapshot_notes: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(snapshot);
  // Validate business logic only - snapshot_period should be 'daily'
  TestValidator.equals(
    "snapshot_period should be 'daily'",
    snapshot.snapshot_period,
    "daily",
  );
}
