import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function test_api_community_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for community operations
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 2. Create a valid community to provide context for snapshot lookup
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(3) +
            "_" +
            RandomGenerator.alphaNumeric(3),
          description: "Test community for snapshot not found validation",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Attempt to retrieve a non-existent snapshot for the valid community
  // This should return 404 Not Found with descriptive error message
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () => {
      await api.functional.redditPlatform.communities.snapshots.at(
        memberConnection,
        {
          name: community.name,
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
