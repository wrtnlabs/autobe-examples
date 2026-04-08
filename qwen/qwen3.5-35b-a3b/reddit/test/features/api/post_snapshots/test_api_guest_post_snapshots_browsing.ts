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

export async function test_api_guest_post_snapshots_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session with randomized device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Create new connection with guest token for API calls
  const guestRequestConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: guestAuth.token.access },
  };
  // 3. Request post snapshots with default pagination
  const response =
    await api.functional.redditPlatform.guest.post_snapshots.index(
      guestRequestConnection,
      {
        body: {} satisfies IRedditPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination default limit is 20",
    response.pagination.limit,
    20,
  );
  TestValidator.notEquals(
    "pagination records is non-negative",
    response.pagination.records,
    null,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Validate data array exists
  TestValidator.predicate(
    "data array is not undefined",
    response.data !== undefined,
  );
  // 6. Validate sorting order (created_at DESC - most recent first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentCreatedAt = new Date(response.data[i].created_at).getTime();
    const nextCreatedAt = new Date(response.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `snapshot ${i} created_at >= snapshot ${i + 1} created_at`,
      currentCreatedAt >= nextCreatedAt,
    );
  }
  // 7. Validate each snapshot record structure
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    // Validate required fields exist and are non-null
    TestValidator.notEquals("snapshot id is not null", snapshot.id, null);
    TestValidator.notEquals("snapshot title is not null", snapshot.title, null);
    TestValidator.notEquals(
      "snapshot post_type is not null",
      snapshot.post_type,
      null,
    );
    TestValidator.notEquals("snapshot score is not null", snapshot.score, null);
    TestValidator.notEquals(
      "snapshot snapshot_type is not null",
      snapshot.snapshot_type,
      null,
    );
    TestValidator.notEquals(
      "snapshot created_at is not null",
      snapshot.created_at,
      null,
    );
    // Validate snapshot_type enum values
    TestValidator.predicate(
      "snapshot_type is valid enum value",
      ["initial", "edit", "delete"].includes(snapshot.snapshot_type),
    );
    // Validate post_type enum values
    TestValidator.predicate(
      "post_type is valid enum value",
      ["text", "link", "image"].includes(snapshot.post_type),
    );
    // Validate score calculation (upvotes_count - downvotes_count)
    const calculatedScore = snapshot.upvotes_count - snapshot.downvotes_count;
    TestValidator.equals(
      "score matches calculated value",
      snapshot.score,
      calculatedScore,
    );
    // Validate author summary fields
    typia.assert(snapshot.author);
    TestValidator.notEquals("author id is not null", snapshot.author.id, null);
    TestValidator.notEquals(
      "author username is not null",
      snapshot.author.username,
      null,
    );
    TestValidator.notEquals(
      "author karma is not null",
      snapshot.author.karma,
      null,
    );
    TestValidator.notEquals(
      "author created_at is not null",
      snapshot.author.created_at,
      null,
    );
    // Validate community summary fields
    typia.assert(snapshot.community);
    TestValidator.notEquals(
      "community id is not null",
      snapshot.community.id,
      null,
    );
    TestValidator.notEquals(
      "community name is not null",
      snapshot.community.name,
      null,
    );
    TestValidator.notEquals(
      "community subscriber_count is not null",
      snapshot.community.subscriber_count,
      null,
    );
    TestValidator.notEquals(
      "community created_at is not null",
      snapshot.community.created_at,
      null,
    );
    TestValidator.notEquals(
      "community updated_at is not null",
      snapshot.community.updated_at,
      null,
    );
    // Validate no sensitive information (email) is exposed in author
    TestValidator.predicate(
      "author does not expose email",
      !snapshot.author.hasOwnProperty("email"),
    );
    // Validate community owner exists and is summary type
    typia.assert(snapshot.community.owner);
    TestValidator.notEquals(
      "community owner id is not null",
      snapshot.community.owner.id,
      null,
    );
    TestValidator.notEquals(
      "community owner username is not null",
      snapshot.community.owner.username,
      null,
    );
    TestValidator.predicate(
      "community owner does not expose email",
      !snapshot.community.owner.hasOwnProperty("email"),
    );
  }
  // 8. Validate timestamps are valid ISO 8601 format
  for (const snapshot of response.data) {
    const createdAt = new Date(snapshot.created_at);
    TestValidator.predicate(
      "created_at is valid date",
      !isNaN(createdAt.getTime()),
    );
  }
}
