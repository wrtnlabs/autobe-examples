import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_snapshots_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session for anonymous browsing
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  // Call post-snapshots endpoint with specific filters
  const response =
    await api.functional.redditPlatform.guest.post_snapshots.index(
      guestConnection,
      {
        body: {
          snapshot_type: "edit",
          post_type: "text",
          sortBy: "score",
          sortOrder: "desc",
          limit: 10,
        } satisfies IRedditPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    10,
  );
  TestValidator.notEquals(
    "pagination records exists",
    response.pagination.records,
    null,
  );
  TestValidator.notEquals(
    "pagination pages exists",
    response.pagination.pages,
    null,
  );
  // Validate filter application
  const snapshotTypes = response.data.map((s) => s.snapshot_type);
  TestValidator.equals(
    "all snapshots have edit type",
    snapshotTypes.every((type) => type === "edit"),
    true,
  );
  const postTypes = response.data.map((s) => s.post_type);
  TestValidator.equals(
    "all snapshots have text type",
    postTypes.every((type) => type === "text"),
    true,
  );
  // Validate sorting order (score DESC)
  if (response.data.length > 1) {
    const scores = response.data.map((s) => s.score);
    for (let i = 0; i < scores.length - 1; i++) {
      TestValidator.predicate(
        `score ${i} >= score ${i + 1}`,
        scores[i] >= scores[i + 1],
      );
    }
  }
  // Validate data integrity
  response.data.forEach((snapshot) => {
    TestValidator.equals(
      "snapshot type is edit",
      snapshot.snapshot_type,
      "edit",
    );
    TestValidator.equals("post type is text", snapshot.post_type, "text");
    TestValidator.equals(
      "score equals upvotes - downvotes",
      snapshot.score,
      snapshot.upvotes_count - snapshot.downvotes_count,
    );
    TestValidator.equals(
      "timestamp is valid date-time",
      typeof snapshot.created_at,
      "string",
    );
    // Verify nested author and community info
    TestValidator.notEquals("author information exists", snapshot.author, null);
    TestValidator.notEquals(
      "community information exists",
      snapshot.community,
      null,
    );
    // Validate author structure
    TestValidator.equals("author has id", snapshot.author.id, undefined);
    TestValidator.equals(
      "author has username",
      snapshot.author.username,
      undefined,
    );
    TestValidator.notEquals("author has karma", snapshot.author.karma, null);
    TestValidator.equals(
      "author has created_at",
      snapshot.author.created_at,
      undefined,
    );
    // Validate community structure
    TestValidator.equals("community has id", snapshot.community.id, undefined);
    TestValidator.equals(
      "community has name",
      snapshot.community.name,
      undefined,
    );
    TestValidator.equals(
      "community has subscriber_count",
      snapshot.community.subscriber_count,
      undefined,
    );
    TestValidator.notEquals(
      "community has owner",
      snapshot.community.owner,
      null,
    );
  });
  // Verify limit was applied
  TestValidator.equals(
    "limit not exceeded in data length",
    response.data.length <= 10,
    true,
  );
}
