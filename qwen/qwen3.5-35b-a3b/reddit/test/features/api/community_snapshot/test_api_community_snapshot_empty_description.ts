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

export async function test_api_community_snapshot_empty_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community snapshot with empty string description
  // (simulating a community with null description in database)
  const communityName = RandomGenerator.name(3);
  const snapshot =
    await api.functional.redditPlatform.member.communities.snapshots.create(
      memberConnection,
      {
        name: communityName,
        body: {
          name: communityName,
          description: "" satisfies string, // Empty string simulates DB null
        },
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot response
  // Description should be non-null empty string, not null
  TestValidator.equals(
    "description is empty string not null",
    snapshot.description,
    "",
  );
  // Validate other required fields are populated
  TestValidator.predicate(
    "snapshot has valid id",
    typia.is<string & tags.Format<"uuid">>(snapshot.id),
  );
  TestValidator.predicate(
    "snapshot has valid community_id",
    typia.is<string & tags.Format<"uuid">>(snapshot.community_id),
  );
  TestValidator.predicate(
    "snapshot name matches",
    snapshot.name === communityName,
  );
  TestValidator.predicate(
    "snapshot has valid created_at",
    typia.is<string & tags.Format<"date-time">>(snapshot.created_at),
  );
  // icon_url is optional and can be null, but if present should be valid URI
  if (snapshot.icon_url !== null && snapshot.icon_url !== undefined) {
    TestValidator.predicate(
      "icon_url is valid URI",
      typia.is<string & tags.Format<"uri">>(snapshot.icon_url),
    );
  }
}
