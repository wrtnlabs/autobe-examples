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

export async function test_api_post_snapshots_guest_snapshot_level_deleted_exclusion(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const guestIdentity = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(guestIdentity);
  // We need a post that has at least one snapshot with deletedAt != null.
  // Since the provided SDK/utility surface does not include fixture creation
  // or post discovery APIs, we select a random UUID and rely on
  // environment pre-seeded data. If the backend rejects it, the test will
  // fail, highlighting missing test fixtures.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 1000 * 60).toISOString();
  const snapshotsDefault =
    await api.functional.communityPlatform.guest.posts.snapshots.processSnapshots(
      guestConnection,
      {
        postId,
        body: {
          publishedAtRange: {
            from,
            to,
          } satisfies {
            from: string & tags.Format<"date-time">;
            to: string & tags.Format<"date-time">;
          },
          // omitted includeDeleted semantics: by passing null we rely on DTO
          // default/exclusion behavior.
          includeDeleted: null,
          orderDirection: "asc",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsDefault);
  TestValidator.equals(
    "guest must not receive snapshot-level deleted records by default",
    snapshotsDefault.deletedAt,
    null,
  );
}
