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

export async function test_api_admin_system_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection - base connection is never used directly
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate random system snapshot ID
  const systemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve system snapshot using actor-specific connection
  const snapshot =
    await api.functional.communityPlatform.admin.system_snapshots.at(
      adminConnection,
      {
        systemSnapshotId,
      },
    );
  // typia.assert performs complete runtime type validation including:
  // - All property existence checks
  // - All type checks (string, number, etc.)
  // - All format validations (UUID, date-time, etc.)
  // - All constraint validations (min, max, etc.)
  typia.assert(snapshot);
  // No additional validation needed after typia.assert() - it validates everything
  // The response structure is guaranteed to match ICommunityPlatformSystemSnapshot schema
}
