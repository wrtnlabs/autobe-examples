import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_snapshot_member_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username:
          RandomGenerator.alphaNumeric(6) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Query post snapshots
  const snapshotRequest: IRedditPlatformPostSnapshot.IRequest = {
    limit: 20,
    sortBy: "created_at" as const,
    sortOrder: "desc" as const,
    snapshot_type: "initial" as const,
    post_type: "text" as const,
    author_id: member.id,
    page: 0,
  } satisfies IRedditPlatformPostSnapshot.IRequest;
  const snapshotResponse: IPageIRedditPlatformPostSnapshot.ISummary =
    await api.functional.redditPlatform.member.post_snapshots.index(
      memberConnection,
      {
        body: snapshotRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    snapshotResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    snapshotResponse.pagination.pages >= 0,
  );
  // 4. Validate snapshot records structure
  if (snapshotResponse.data.length > 0) {
    const firstSnapshot = snapshotResponse.data[0];
    typia.assert(firstSnapshot);
    TestValidator.predicate(
      "snapshot title non-empty",
      firstSnapshot.title.length > 0,
    );
    TestValidator.predicate(
      "snapshot post_type valid",
      ["text", "link", "image"].includes(firstSnapshot.post_type),
    );
    TestValidator.predicate(
      "snapshot snapshot_type valid",
      ["initial", "edit", "delete"].includes(firstSnapshot.snapshot_type),
    );
    TestValidator.predicate(
      "snapshot upvotes non-negative",
      firstSnapshot.upvotes_count >= 0,
    );
    TestValidator.predicate(
      "snapshot downvotes non-negative",
      firstSnapshot.downvotes_count >= 0,
    );
    TestValidator.predicate(
      "snapshot comment_count non-negative",
      firstSnapshot.comment_count >= 0,
    );
    // 5. Validate author object
    typia.assert(firstSnapshot.author);
    TestValidator.predicate(
      "author username non-empty",
      firstSnapshot.author.username.length > 0,
    );
    // 6. Validate community object
    typia.assert(firstSnapshot.community);
    TestValidator.predicate(
      "community name non-empty",
      firstSnapshot.community.name.length > 0,
    );
  }
}
