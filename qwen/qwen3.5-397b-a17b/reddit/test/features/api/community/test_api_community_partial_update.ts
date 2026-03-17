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

export async function test_api_community_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member who will own the community
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 2. Create a new community with initial name, description, and icon
  const initialName = RandomGenerator.paragraph({ sentences: 1 });
  const initialDescription = RandomGenerator.content({ paragraphs: 2 });
  const initialIcon = typia.random<string & tags.Format<"uri">>();
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: initialName,
        description: initialDescription,
        icon: initialIcon satisfies string as string,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Verify initial community state
  TestValidator.equals("initial name", community.name, initialName);
  TestValidator.equals(
    "initial description",
    community.description,
    initialDescription,
  );
  TestValidator.equals("initial icon", community.icon, initialIcon);
  const initialUpdatedAt = community.updated_at;
  // 3. Update only the description field
  const updatedDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedCommunity1 = await api.functional.redditClone.communities.update(
    memberConnection,
    {
      communityId: community.id,
      body: {
        description: updatedDescription,
      } satisfies IRedditCloneCommunity.IUpdate,
    },
  );
  typia.assert(updatedCommunity1);
  // 4. Verify description updated, name and icon unchanged
  TestValidator.equals(
    "name unchanged after description update",
    updatedCommunity1.name,
    initialName,
  );
  TestValidator.equals(
    "description updated",
    updatedCommunity1.description,
    updatedDescription,
  );
  TestValidator.equals(
    "icon unchanged after description update",
    updatedCommunity1.icon,
    initialIcon,
  );
  TestValidator.predicate(
    "updated_at refreshed after description update",
    updatedCommunity1.updated_at > initialUpdatedAt,
  );
  const updatedAtAfterDescription = updatedCommunity1.updated_at;
  // 5. Update only the icon field
  const updatedIcon = typia.random<string & tags.Format<"uri">>();
  const updatedCommunity2 = await api.functional.redditClone.communities.update(
    memberConnection,
    {
      communityId: community.id,
      body: {
        icon: updatedIcon satisfies string as string,
      } satisfies IRedditCloneCommunity.IUpdate,
    },
  );
  typia.assert(updatedCommunity2);
  // 6. Verify icon updated, name and description unchanged
  TestValidator.equals(
    "name unchanged after icon update",
    updatedCommunity2.name,
    initialName,
  );
  TestValidator.equals(
    "description unchanged after icon update",
    updatedCommunity2.description,
    updatedDescription,
  );
  TestValidator.equals("icon updated", updatedCommunity2.icon, updatedIcon);
  TestValidator.predicate(
    "updated_at refreshed after icon update",
    updatedCommunity2.updated_at > updatedAtAfterDescription,
  );
  const updatedAtAfterIcon = updatedCommunity2.updated_at;
  // 7. Update only the name field
  const updatedName = RandomGenerator.paragraph({ sentences: 1 });
  const updatedCommunity3 = await api.functional.redditClone.communities.update(
    memberConnection,
    {
      communityId: community.id,
      body: {
        name: updatedName,
      } satisfies IRedditCloneCommunity.IUpdate,
    },
  );
  typia.assert(updatedCommunity3);
  // 8. Verify name updated, description and icon unchanged
  TestValidator.equals("name updated", updatedCommunity3.name, updatedName);
  TestValidator.equals(
    "description unchanged after name update",
    updatedCommunity3.description,
    updatedDescription,
  );
  TestValidator.equals(
    "icon unchanged after name update",
    updatedCommunity3.icon,
    updatedIcon,
  );
  TestValidator.predicate(
    "updated_at refreshed after name update",
    updatedCommunity3.updated_at > updatedAtAfterIcon,
  );
}