import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

export async function test_api_reddit_platform_community_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
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
  // 2. Generate community data
  const communityName = "test_community_" + RandomGenerator.alphaNumeric(8);
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const iconUrl = "https://example.com/icon.png";
  // 3. Create a new community using authenticated member connection
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: description,
          icon_url: iconUrl,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Validate response structure and data integrity
  // Name returned exactly as provided
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  // Owner populated with authenticated member's summary
  TestValidator.equals(
    "owner id matches authenticated member",
    community.owner.id,
    auth.id,
  );
  TestValidator.equals(
    "owner username matches",
    community.owner.username,
    auth.username,
  );
  TestValidator.predicate("owner has valid karma", community.owner.karma >= 0);
  TestValidator.predicate(
    "owner created_at is valid ISO timestamp",
    !isNaN(Date.parse(community.owner.created_at)),
  );
  // System-generated fields present
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(community.id),
  );
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    !isNaN(Date.parse(community.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO timestamp",
    !isNaN(Date.parse(community.updated_at)),
  );
  // Aggregation fields initialized to 0
  TestValidator.equals(
    "subscribers_count starts at 0",
    community.subscribers_count,
    0,
  );
  TestValidator.equals("posts_count starts at 0", community.posts_count, 0);
  TestValidator.equals(
    "comments_count starts at 0",
    community.comments_count,
    0,
  );
  // Optional fields returned correctly
  TestValidator.equals(
    "description returned as provided",
    community.description,
    description,
  );
  TestValidator.equals(
    "icon_url returned as provided",
    community.icon_url,
    iconUrl,
  );
}
