import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMvCommunitySubscriberCount } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMvCommunitySubscriberCount";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_subscriber_metrics_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Generate random UUID that doesn't correspond to any existing community
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Create valid request body for metrics
  const requestBody = {
    startDate: typia.random<string & tags.Format<"date-time">>(),
    endDate: typia.random<string & tags.Format<"date-time">>(),
    period: "daily" as const,
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies ICommunityPlatformMvCommunitySubscriberCount.IRequest;
  // Call metrics endpoint with non-existent community ID
  await TestValidator.httpError(
    "should return 404 for non-existent community",
    404,
    async () =>
      await api.functional.communityPlatform.admin.communities.subscribers.metrics(
        adminConnection,
        {
          communityId: nonExistentCommunityId,
          body: requestBody,
        },
      ),
  );
}
