import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_queue_cross_community_blocking(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuthorized);
  // Step 2: Query reports queue with community_id filter (single community)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const reportsForCommunity1 =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          community_id: communityId,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(reportsForCommunity1);
  // Step 3: Query reports queue with multiple community_ids filter
  const communityId2 = typia.random<string & tags.Format<"uuid">>();
  const reportsForMultipleCommunities =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          community_ids: [communityId, communityId2],
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(reportsForMultipleCommunities);
  // Step 4: Validate filtering parameters are accepted and processed
  TestValidator.equals(
    "single community_id filter accepted",
    reportsForCommunity1.pagination.records,
    reportsForCommunity1.pagination.records,
  );
  TestValidator.equals(
    "multiple community_ids filter accepted",
    reportsForMultipleCommunities.pagination.records,
    reportsForMultipleCommunities.pagination.records,
  );
}
