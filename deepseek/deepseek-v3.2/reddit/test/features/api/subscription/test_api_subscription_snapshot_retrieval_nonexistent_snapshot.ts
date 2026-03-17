import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_snapshot_retrieval_nonexistent_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as member using utility function (discard result since we only need session)
  await authorize_member_join(memberConnection, {});
  // Generate random non-existent snapshot ID
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent snapshot - should return 404
  await TestValidator.httpError(
    "retrieving non-existent subscription snapshot",
    404,
    async () => {
      await api.functional.communityPlatform.member.subscription_snapshots.at(
        memberConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
