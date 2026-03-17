import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_community_creation_without_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member who will create the community
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community without icon field (only required fields: name and description)
  const communityName = RandomGenerator.alphabets(10);
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: communityName,
        description: communityDescription,
        // icon is intentionally omitted to test it's truly optional
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Validate community was created successfully
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    communityDescription,
  );
  TestValidator.predicate(
    "icon is null or undefined",
    community.icon === null || community.icon === undefined,
  );
  TestValidator.equals(
    "subscriber count is 1 (creator auto-subscribed)",
    community.subscriber_count,
    1,
  );
  TestValidator.equals("owner is the creator", community.owner.id, member.id);
  TestValidator.equals(
    "owner username matches",
    community.owner.username,
    member.username,
  );
}
