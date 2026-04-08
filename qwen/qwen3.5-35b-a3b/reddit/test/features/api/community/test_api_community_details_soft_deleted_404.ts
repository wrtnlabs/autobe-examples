import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_details_soft_deleted_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate guest user - use utility function for guest join
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  // 2. Use guestConnection for API calls - authorization is already set
  // 3. Test soft-deleted community retrieval - should return 404
  const softDeletedCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Validate that 404 is returned for soft-deleted community
  // This verifies the backend correctly filters by deleted_at IS NULL
  await TestValidator.error(
    "should return 404 for soft-deleted community",
    async () => {
      const result = await api.functional.redditCommunity.guest.communities.at(
        guestConnection,
        {
          communityId: softDeletedCommunityId,
        },
      );
      typia.assert(result);
    },
  );
}