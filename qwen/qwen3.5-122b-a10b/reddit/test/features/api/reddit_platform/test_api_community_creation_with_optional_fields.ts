import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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

export async function test_api_community_creation_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community with only required name field
  const community1 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // 3. Create community with name and description
  const description = RandomGenerator.paragraph({ sentences: 5 });
  const community2 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: description,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // 4. Validate community1 (name only, no description)
  TestValidator.predicate("community1 has name", community1.name.length > 0);
  TestValidator.equals(
    "community1 description is null",
    community1.description,
    null,
  );
  TestValidator.equals(
    "community1 owner id matches member",
    community1.owner.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community1 owner username matches",
    community1.owner.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "community1 subscriber count is 1",
    community1.subscriberCount,
    1,
  );
  TestValidator.predicate(
    "community1 has createdAt",
    new Date(community1.createdAt).getTime() > 0,
  );
  // 5. Validate community2 (with description)
  TestValidator.predicate("community2 has name", community2.name.length > 0);
  TestValidator.equals(
    "community2 description matches input",
    community2.description,
    description,
  );
  TestValidator.equals(
    "community2 owner id matches member",
    community2.owner.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community2 owner username matches",
    community2.owner.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "community2 subscriber count is 1",
    community2.subscriberCount,
    1,
  );
  TestValidator.predicate(
    "community2 has createdAt",
    new Date(community2.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "community2 has updatedAt",
    new Date(community2.updatedAt).getTime() > 0,
  );
  TestValidator.equals(
    "community2 deletedAt is null",
    community2.deletedAt,
    null,
  );
}