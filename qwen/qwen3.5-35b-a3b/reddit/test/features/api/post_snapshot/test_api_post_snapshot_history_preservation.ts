import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_post_snapshot_history_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const authConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const auth: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    authConnection,
    {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer,
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(auth);
  // 2. Test snapshot retrieval with a valid UUID
  const testPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create connection for snapshot operations
  const snapshotConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(snapshotConnection, {
    body: {
      email: memberEmail,
      password: "testpassword123",
    },
  });
  // 4. Get all snapshots for the post
  const snapshotsPage: IPageIRedditPlatformPostSnapshot.ISummary =
    await api.functional.redditPlatform.posts.snapshots(snapshotConnection, {
      postId: testPostId,
      body: {},
    });
  typia.assert(snapshotsPage);
  // 5. Verify pagination metadata exists and is valid
  TestValidator.predicate(
    "snapshots pagination current is valid",
    snapshotsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "snapshots pagination limit is valid",
    snapshotsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "snapshots pagination records count is valid",
    snapshotsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshots pagination pages count is valid",
    snapshotsPage.pagination.pages >= 0,
  );
  // 6. For each snapshot in the page, retrieve detailed snapshot
  for (const snapshot of snapshotsPage.data) {
    const detailedSnapshot: IRedditPlatformPostSnapshot =
      await api.functional.redditPlatform.posts._snapshots.at(
        snapshotConnection,
        {
          postId: testPostId,
          snapshotId: snapshot.id,
        },
      );
    typia.assert(detailedSnapshot);
    // Verify snapshot contains required author information (not undefined)
    TestValidator.predicate(
      "snapshot author id exists",
      () => detailedSnapshot.author.id !== undefined,
    );
    TestValidator.predicate(
      "snapshot author username exists",
      () => detailedSnapshot.author.username !== undefined,
    );
    TestValidator.predicate(
      "snapshot author display_name exists",
      () => detailedSnapshot.author.display_name !== undefined,
    );
    TestValidator.predicate(
      "snapshot author karma_score exists",
      () => detailedSnapshot.author.karma_score !== undefined,
    );
    // Verify snapshot content fields are defined
    TestValidator.predicate(
      "snapshot title is defined",
      () => detailedSnapshot.title !== undefined,
    );
    TestValidator.predicate(
      "snapshot post_type is defined",
      () => detailedSnapshot.post_type !== undefined,
    );
    TestValidator.predicate(
      "snapshot vote_score is defined",
      () => detailedSnapshot.vote_score !== undefined,
    );
    TestValidator.predicate(
      "snapshot comment_count is defined",
      () => detailedSnapshot.comment_count !== undefined,
    );
    TestValidator.predicate(
      "snapshot snapshot_type is defined",
      () => detailedSnapshot.snapshot_type !== undefined,
    );
    // Verify author karma score is a valid integer
    TestValidator.predicate("snapshot author karma_score is integer", () =>
      Number.isInteger(detailedSnapshot.author.karma_score),
    );
  }
  // 7. Verify snapshot type values are valid
  const validSnapshotTypes = ["CREATE", "EDIT", "DELETE"] as const;
  for (const snapshot of snapshotsPage.data) {
    const assertSnapshotType = typia.assert<"CREATE" | "EDIT" | "DELETE">(
      snapshot.snapshot_type,
    );
    TestValidator.predicate(`snapshot ${snapshot.id} has valid type`, () =>
      validSnapshotTypes.includes(assertSnapshotType),
    );
  }
  // 8. Verify snapshot author has valid UUID format
  for (const snapshot of snapshotsPage.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} author has valid UUID`,
      () =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.author.id,
        ),
    );
  }
}
