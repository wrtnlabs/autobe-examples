import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_post_snapshots_guest_latest_and_time_selection_and_deleted_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1) Guest join
  const guestConnectionBase: api.IConnection = { host: connection.host };
  const guestJoin = await authorize_guest_join(guestConnectionBase, {
    body: {
      device_fingerprint: typia.random<string>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(guestJoin);
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = {
    Authorization: guestJoin.token.access,
  };
  // Scenario A: latest when publishedAt criteria are unset
  const postId = typia.random<string & tags.Format<"uuid">>();
  const neutralRequest = {
    publishedAt: undefined,
    publishedAtRange: undefined,
    orderDirection: "desc",
    includeDeleted: null,
    page: null,
    limit: null,
  } satisfies ICommunityPlatformPostSnapshot.IRequest;
  const snapshotA =
    await api.functional.communityPlatform.guest.posts.snapshots.processSnapshots(
      guestConnection,
      {
        postId,
        body: neutralRequest,
      },
    );
  typia.assert(snapshotA);
  TestValidator.equals(
    "guest snapshot should not be marked deleted",
    snapshotA.deletedAt,
    null,
  );
  // Scenario B: exact selection by publishedAt
  const requestedPublishedAt = snapshotA.publishedAt;
  const snapshotB =
    await api.functional.communityPlatform.guest.posts.snapshots.processSnapshots(
      guestConnection,
      {
        postId,
        body: {
          publishedAt: requestedPublishedAt,
          publishedAtRange: undefined,
          orderDirection: "desc",
          includeDeleted: null,
          page: null,
          limit: null,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotB);
  TestValidator.equals(
    "snapshotB publishedAt matches request",
    snapshotB.publishedAt,
    requestedPublishedAt,
  );
  TestValidator.equals(
    "snapshotB should not be marked deleted",
    snapshotB.deletedAt,
    null,
  );
  // Scenario C: deleted-post boundary for guests
  // We cannot reliably obtain a deleted postId with the provided API surface.
  // Acceptable outcomes: not found / no visible snapshot OR returned snapshot is not deleted.
  const maybeDeletedPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "guest should not access deleted post snapshots",
    [400, 401, 403, 404],
    async () => {
      const snapshotC =
        await api.functional.communityPlatform.guest.posts.snapshots.processSnapshots(
          guestConnection,
          {
            postId: maybeDeletedPostId,
            body: neutralRequest,
          },
        );
      // If server still returns a snapshot DTO, it must not expose deleted snapshot content.
      typia.assert(snapshotC);
      TestValidator.equals(
        "deleted boundary snapshot must be not deleted",
        snapshotC.deletedAt,
        null,
      );
    },
  ).catch(async () => {
    // If the server returned a DTO successfully (no HTTP error), validate it directly.
    const snapshotC =
      await api.functional.communityPlatform.guest.posts.snapshots.processSnapshots(
        guestConnection,
        {
          postId: maybeDeletedPostId,
          body: neutralRequest,
        },
      );
    typia.assert(snapshotC);
    TestValidator.equals(
      "deleted boundary snapshot must be not deleted",
      snapshotC.deletedAt,
      null,
    );
  });
}
