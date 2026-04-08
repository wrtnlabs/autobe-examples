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

export async function test_api_reddit_platform_multiple_community_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create first community with full data
  const community1 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "tech_discussion",
          description:
            "A community for technology enthusiasts to discuss latest trends, tools, and innovations in software development, AI, and digital transformation.",
          icon_url: "https://example.com/icons/tech_community.png",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // 3. Create second community with different data
  const community2 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "gaming_hub",
          description:
            "A place for gamers to share tips, strategies, and news about video games across all platforms including PC, console, and mobile.",
          icon_url: "https://example.com/icons/gaming_community.png",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // 4. Create third community with minimal fields (name only)
  const community3 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "book_club",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  // 5. Verify all communities have different unique names
  TestValidator.notEquals(
    "community1 name differs from community2",
    community1.name,
    community2.name,
  );
  TestValidator.notEquals(
    "community1 name differs from community3",
    community1.name,
    community3.name,
  );
  TestValidator.notEquals(
    "community2 name differs from community3",
    community2.name,
    community3.name,
  );
  // 6. Verify all communities have same owner (authenticated member)
  TestValidator.equals(
    "community1 owner matches authenticated member",
    community1.owner.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community2 owner matches authenticated member",
    community2.owner.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community3 owner matches authenticated member",
    community3.owner.id,
    memberAuth.id,
  );
  // 7. Verify all communities have correct owner username
  TestValidator.equals(
    "community1 owner username",
    community1.owner.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "community2 owner username",
    community2.owner.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "community3 owner username",
    community3.owner.username,
    memberAuth.username,
  );
  // 8. Verify all communities have zero counts (new communities)
  TestValidator.equals(
    "community1 subscribers count",
    community1.subscribers_count,
    0,
  );
  TestValidator.equals(
    "community2 subscribers count",
    community2.subscribers_count,
    0,
  );
  TestValidator.equals(
    "community3 subscribers count",
    community3.subscribers_count,
    0,
  );
  TestValidator.equals("community1 posts count", community1.posts_count, 0);
  TestValidator.equals("community2 posts count", community2.posts_count, 0);
  TestValidator.equals("community3 posts count", community3.posts_count, 0);
  TestValidator.equals(
    "community1 comments count",
    community1.comments_count,
    0,
  );
  TestValidator.equals(
    "community2 comments count",
    community2.comments_count,
    0,
  );
  TestValidator.equals(
    "community3 comments count",
    community3.comments_count,
    0,
  );
  // 9. Verify community1 has full data
  TestValidator.equals("community1 name", community1.name, "tech_discussion");
  TestValidator.equals(
    "community1 description",
    community1.description,
    "A community for technology enthusiasts to discuss latest trends, tools, and innovations in software development, AI, and digital transformation.",
  );
  TestValidator.notEquals("community1 icon_url", community1.icon_url, null);
  // 10. Verify community2 has full data
  TestValidator.equals("community2 name", community2.name, "gaming_hub");
  TestValidator.equals(
    "community2 description",
    community2.description,
    "A place for gamers to share tips, strategies, and news about video games across all platforms including PC, console, and mobile.",
  );
  TestValidator.notEquals("community2 icon_url", community2.icon_url, null);
  // 11. Verify community3 has minimal data
  TestValidator.equals("community3 name", community3.name, "book_club");
  TestValidator.equals(
    "community3 description",
    community3.description,
    undefined,
  );
  TestValidator.equals("community3 icon_url", community3.icon_url, undefined);
  // 12. Verify all communities have valid UUID format for id
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "community1 id is valid UUID",
    uuidRegex.test(community1.id),
  );
  TestValidator.predicate(
    "community2 id is valid UUID",
    uuidRegex.test(community2.id),
  );
  TestValidator.predicate(
    "community3 id is valid UUID",
    uuidRegex.test(community3.id),
  );
  // 13. Verify all communities have valid ISO datetime for timestamps
  TestValidator.predicate(
    "community1 created_at is valid datetime",
    !isNaN(Date.parse(community1.created_at)),
  );
  TestValidator.predicate(
    "community1 updated_at is valid datetime",
    !isNaN(Date.parse(community1.updated_at)),
  );
  TestValidator.predicate(
    "community2 created_at is valid datetime",
    !isNaN(Date.parse(community2.created_at)),
  );
  TestValidator.predicate(
    "community2 updated_at is valid datetime",
    !isNaN(Date.parse(community2.updated_at)),
  );
  TestValidator.predicate(
    "community3 created_at is valid datetime",
    !isNaN(Date.parse(community3.created_at)),
  );
  TestValidator.predicate(
    "community3 updated_at is valid datetime",
    !isNaN(Date.parse(community3.updated_at)),
  );
  // 14. Verify deleted_at is null for all communities (active communities)
  TestValidator.equals("community1 deleted_at", community1.deleted_at, null);
  TestValidator.equals("community2 deleted_at", community2.deleted_at, null);
  TestValidator.equals("community3 deleted_at", community3.deleted_at, null);
}
