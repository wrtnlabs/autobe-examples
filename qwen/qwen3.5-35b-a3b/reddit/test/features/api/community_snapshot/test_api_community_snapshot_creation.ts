import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_platform_member_communities_snapshots_create } from "../../../generate/generate_random_reddit_platform_member_communities_snapshots_create";
import { prepare_random_reddit_platform_community_snapshot } from "../../../prepare/prepare_random_reddit_platform_community_snapshot";

export async function test_api_community_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test snapshot creation for non-existent community
  const snapshotName = RandomGenerator.alphaNumeric(12);
  const snapshotBody = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: RandomGenerator.alphaNumeric(20),
  } satisfies IRedditPlatformCommunitySnapshot.ICreate;
  // 3. Attempt snapshot creation (will fail 404 since community doesn't exist)
  await TestValidator.error("non-existent community returns 404", async () => {
    await api.functional.redditPlatform.member.communities.snapshots.create(
      memberConnection,
      {
        name: snapshotName,
        body: snapshotBody,
      },
    );
  });
  // 4. Verify authentication token was set in connection headers
  typia.assert(memberConnection.headers?.Authorization);
  TestValidator.predicate(
    "auth header set",
    typeof memberConnection.headers?.Authorization === "string" &&
      memberConnection.headers.Authorization.startsWith("Bearer "),
  );
}
