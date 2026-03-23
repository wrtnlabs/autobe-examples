import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePostSnapshot";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_post_snapshot_retrieval_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as guest to obtain authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const joinBody: IRedditLikeGuest.IJoin = {
    device_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const guest: IRedditLikeGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(guest);
  // Step 2: Retrieve post snapshots as guest (using mock post ID)
  const mockPostId = typia.random<string & tags.Format<"uuid">>();
  const snapshots = await api.functional.redditLike.guest.posts.snapshots.index(
    guestConnection,
    {
      postId: mockPostId,
      body: {
        limit: 10,
        offset: 0,
        sort: "new",
        page: 1,
      },
    },
  );
  typia.assert(snapshots);
  // Step 3: Validate response structure
  TestValidator.equals("has pagination", typeof snapshots.pagination, "object");
  TestValidator.equals("pagination fields", snapshots.pagination.current, 1);
  TestValidator.equals("pagination fields", snapshots.pagination.limit, 10);
  TestValidator.predicate("has records", snapshots.pagination.records >= 0);
  // Step 4: Validate snapshot content structure (when data exists)
  if (snapshots.data.length > 0) {
    snapshots.data.forEach((snapshot, index) => {
      TestValidator.equals("snapshot type", typeof snapshot.type, "string");
      TestValidator.equals("snapshot author", typeof snapshot.author, "object");
      TestValidator.equals(
        "snapshot author id",
        typeof snapshot.author.id,
        "string",
      );
      TestValidator.equals(
        "snapshot author username",
        typeof snapshot.author.username,
        "string",
      );
      TestValidator.equals("snapshot title", typeof snapshot.title, "string");
      TestValidator.equals(
        "snapshot created at",
        typeof snapshot.snapshot_created_at,
        "string",
      );
      TestValidator.predicate(
        "is valid date time",
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          snapshot.snapshot_created_at,
        ),
      );
    });
    // Step 5: Validate chronological order (newest first)
    for (let i = 0; i < snapshots.data.length - 1; i++) {
      const current = new Date(snapshots.data[i].snapshot_created_at).getTime();
      const next = new Date(
        snapshots.data[i + 1].snapshot_created_at,
      ).getTime();
      TestValidator.predicate(
        "snapshots ordered by time (newest first)",
        current >= next,
      );
    }
  }
}
