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

export async function test_api_post_snapshot_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const guestId = typia.random<string & tags.Format<"uuid">>();
  await authorize_guest_join(guestConnection, {
    body: { device_id: guestId } satisfies IRedditLikeGuest.IJoin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Test basic pagination with limit and offset
  const limitedResult =
    await api.functional.redditLike.guest.posts.snapshots.index(
      guestConnection,
      {
        postId,
        body: {
          limit: 5,
          offset: 0,
        } satisfies IRedditLikePostSnapshot.IRequest,
      },
    );
  typia.assert(limitedResult);
  TestValidator.equals("limit applied", limitedResult.data.length <= 5, true);
  // Test sorting options
  const newResult = await api.functional.redditLike.guest.posts.snapshots.index(
    guestConnection,
    {
      postId,
      body: {
        sort: "new",
      } satisfies IRedditLikePostSnapshot.IRequest,
    },
  );
  typia.assert(newResult);
  const hotResult = await api.functional.redditLike.guest.posts.snapshots.index(
    guestConnection,
    {
      postId,
      body: {
        sort: "hot",
      } satisfies IRedditLikePostSnapshot.IRequest,
    },
  );
  typia.assert(hotResult);
  // Test time filter options
  const allTimeResult =
    await api.functional.redditLike.guest.posts.snapshots.index(
      guestConnection,
      {
        postId,
        body: {
          timeFilter: "all",
        } satisfies IRedditLikePostSnapshot.IRequest,
      },
    );
  typia.assert(allTimeResult);
  // Test pagination with page parameter
  const pageResult =
    await api.functional.redditLike.guest.posts.snapshots.index(
      guestConnection,
      {
        postId,
        body: {
          page: 1,
        } satisfies IRedditLikePostSnapshot.IRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.predicate("pagination exists", pageResult.pagination !== null);
}
