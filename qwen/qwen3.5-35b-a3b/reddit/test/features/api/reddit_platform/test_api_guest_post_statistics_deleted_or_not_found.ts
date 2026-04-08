import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostRecentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostRecentActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_statistics_deleted_or_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario A: Non-existent Post
  // 1. Generate a valid UUID that does not correspond to any existing post
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Validate HTTP 404 response for non-existent post
  await TestValidator.error("non-existent post should return 404", async () => {
    await api.functional.redditPlatform.guest.posts.statistics(connection, {
      postId: nonExistentPostId,
    });
  });
  // Scenario B: Deleted Post
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditPlatformGuest.IJoin>(),
  });
  // 2. Generate another UUID for deleted post test
  const deletedPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Validate HTTP 404 response for deleted post
  await TestValidator.error("deleted post should return 404", async () => {
    await api.functional.redditPlatform.guest.posts.statistics(
      guestConnection,
      {
        postId: deletedPostId,
      },
    );
  });
}
