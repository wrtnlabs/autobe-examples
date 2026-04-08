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
import { generate_random_reddit_platform_member_communities_snapshots_create } from "../../../generate/generate_random_reddit_platform_member_communities_snapshots_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_snapshot } from "../../../prepare/prepare_random_reddit_platform_community_snapshot";

export async function test_api_community_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create a test community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(8) +
            "_" +
            RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          icon_url: "https://example.com/icon.png" as const,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a snapshot of the community
  const snapshot =
    await generate_random_reddit_platform_member_communities_snapshots_create(
      memberConnection,
      {
        params: {
          name: community.name,
        },
      },
    );
  typia.assert(snapshot);
  // 4. Retrieve the snapshot using actor-specific connection
  const retrievalConnection: api.IConnection = { host: connection.host };
  const retrievedSnapshot =
    await api.functional.redditPlatform.communities.snapshots.at(
      retrievalConnection,
      {
        name: community.name,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Validate snapshot data matches retrieved data
  TestValidator.equals(
    "snapshot name matches",
    retrievedSnapshot.name,
    snapshot.name,
  );
  TestValidator.equals(
    "snapshot description matches",
    retrievedSnapshot.description,
    snapshot.description,
  );
  TestValidator.equals(
    "snapshot icon_url matches",
    retrievedSnapshot.icon_url,
    snapshot.icon_url,
  );
  TestValidator.equals(
    "snapshot community_id matches",
    retrievedSnapshot.community_id,
    snapshot.community_id,
  );
  TestValidator.equals(
    "snapshot id matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot created_at matches",
    retrievedSnapshot.created_at,
    snapshot.created_at,
  );
  // 6. Validate snapshot captured community state correctly
  TestValidator.equals(
    "snapshot name captures community name",
    retrievedSnapshot.name,
    community.name,
  );
  TestValidator.equals(
    "snapshot description captures community description",
    retrievedSnapshot.description,
    community.description ?? "",
  );
  TestValidator.equals(
    "snapshot icon_url captures community icon_url",
    retrievedSnapshot.icon_url,
    community.icon_url,
  );
}
