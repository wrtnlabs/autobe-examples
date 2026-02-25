import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of complete community snapshot history by an administrator.
 * 1. Authenticate as admin using the authorization join endpoint
 * 2. Call the snapshot retrieval endpoint without any filters to retrieve entire history
 * 3. Verify pagination metadata structure is present
 * 4. Validate snapshot data structure
 * 5. Ensure snapshots are sorted by creation date in descending order
 */
export async function test_api_community_snapshot_admin_retrieval_all_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a random community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 2. Call snapshot retrieval endpoint without filters (empty request body)
  const response =
    await api.functional.communityPlatform.admin.communities.snapshots.index(
      adminConnection,
      {
        communityId,
        body: {} satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 3. Verify pagination structure exists (typia.assert already validated all properties)
  TestValidator.predicate(
    "pagination object exists",
    typeof response.pagination === "object",
  );
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 4. Validate each snapshot (typia.assert already validated all properties)
  for (const snapshot of response.data) {
    typia.assert(snapshot);
  }
  // 5. Verify sorting by checking creation dates (if we have multiple snapshots)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const currentDate = new Date(response.data[i].created_at);
      const previousDate = new Date(response.data[i - 1].created_at);
      TestValidator.predicate(
        "snapshots sorted descending by creation date",
        previousDate >= currentDate,
      );
    }
  }
}
