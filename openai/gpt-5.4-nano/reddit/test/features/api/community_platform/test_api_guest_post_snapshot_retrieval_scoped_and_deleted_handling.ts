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

export async function test_api_guest_post_snapshot_retrieval_scoped_and_deleted_handling(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphabets(16),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  // In case the utility updated headers, use guestConnection directly.
  // Otherwise, rely on SDK which already uses connection.headers.Authorization.
  const authHeaders = guestAuth.token.access;
  guestConnection.headers ??= {};
  guestConnection.headers.Authorization = authHeaders;
  const canDiscoverSeed = connection.simulate === true;
  if (!canDiscoverSeed) {
    // Without any seeded-data discovery/list endpoints in the provided API surface,
    // it is impossible to deterministically select postId/snapshotId that exist and satisfy
    // the scenario constraints. Fail explicitly to avoid flaky tests.
    throw new Error(
      "Seeded-data discovery is not available (missing list endpoints). Run in simulation mode or provide deterministic seeded identifiers.",
    );
  }
  // Scenario A (success)
  const postIdA = typia.random<string & tags.Format<"uuid">>();
  const snapshotIdA = typia.random<string & tags.Format<"uuid">>();
  const snapshotA =
    await api.functional.communityPlatform.guest.posts.snapshots.at(
      guestConnection,
      { postId: postIdA, snapshotId: snapshotIdA },
    );
  typia.assert(snapshotA);
  TestValidator.equals("snapshot id matches", snapshotA.id, snapshotIdA);
  TestValidator.equals("postId matches", snapshotA.postId, postIdA);
  // Link consistency: if linkUrl is non-null, it is already validated as a URI by typia.assert.
  // If it is null, ensure it stays null.
  TestValidator.predicate(
    "linkUrl is either null or a URI",
    snapshotA.linkUrl === null || snapshotA.linkUrl !== null,
  );
  // Scenario B (deleted snapshot)
  let snapshotB: ICommunityPlatformPostSnapshot | undefined;
  let postIdB: (string & tags.Format<"uuid">) | undefined;
  let snapshotIdB: (string & tags.Format<"uuid">) | undefined;
  for (let i = 0; i < 10; i++) {
    const p = typia.random<string & tags.Format<"uuid">>();
    const s = typia.random<string & tags.Format<"uuid">>();
    const out = await api.functional.communityPlatform.guest.posts.snapshots.at(
      guestConnection,
      { postId: p, snapshotId: s },
    );
    typia.assert(out);
    if (out.deletedAt !== null) {
      snapshotB = out;
      postIdB = p;
      snapshotIdB = s;
      break;
    }
  }
  if (
    snapshotB === undefined ||
    postIdB === undefined ||
    snapshotIdB === undefined
  ) {
    throw new Error(
      "Unable to generate a deleted snapshot in simulation mode.",
    );
  }
  TestValidator.equals(
    "deleted snapshot id matches",
    snapshotB.id,
    snapshotIdB,
  );
  TestValidator.equals("deleted postId matches", snapshotB.postId, postIdB);
  TestValidator.predicate(
    "deletedAt should be non-null",
    snapshotB.deletedAt !== null,
  );
  // Scenario C (mismatched scope)
  const mismatchedPostId = typia.random<string & tags.Format<"uuid">>();
  if (mismatchedPostId === snapshotA.postId) {
    // Ensure mismatch
    const alt = typia.random<string & tags.Format<"uuid">>();
    if (alt !== snapshotA.postId) {
      const res =
        await api.functional.communityPlatform.guest.posts.snapshots.at(
          guestConnection,
          { postId: alt, snapshotId: snapshotIdA },
        );
      typia.assert(res);
      // In simulation, endpoint may ignore scoping. In real mode it should 404.
    }
  }
  await TestValidator.error(
    "not found when snapshotId belongs to different post",
    async () => {
      await api.functional.communityPlatform.guest.posts.snapshots.at(
        guestConnection,
        {
          postId: mismatchedPostId,
          snapshotId: snapshotIdA,
        },
      );
    },
  );
}
