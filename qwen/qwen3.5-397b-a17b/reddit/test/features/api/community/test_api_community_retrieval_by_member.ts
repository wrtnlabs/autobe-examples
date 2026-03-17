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

export async function test_api_community_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
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
  typia.assert(owner);
  // 2. Owner creates a community
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create second member account (retriever)
  const retrieverConnection: api.IConnection = { host: connection.host };
  const retriever = await authorize_member_join(retrieverConnection, {
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
  typia.assert(retriever);
  // 4. Retriever fetches community details
  const retrievedCommunity = await api.functional.redditClone.communities.at(
    retrieverConnection,
    {
      communityId: community.id,
    },
  );
  typia.assert(retrievedCommunity);
  // 5. Verify community details match
  TestValidator.equals("community id", retrievedCommunity.id, community.id);
  TestValidator.equals(
    "community name",
    retrievedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community description",
    retrievedCommunity.description,
    community.description,
  );
  TestValidator.equals(
    "community icon",
    retrievedCommunity.icon,
    community.icon,
  );
  TestValidator.equals("owner id", retrievedCommunity.owner.id, owner.id);
  TestValidator.equals(
    "owner username",
    retrievedCommunity.owner.username,
    owner.username,
  );
  TestValidator.predicate(
    "subscriber count positive",
    retrievedCommunity.subscriber_count >= 1,
  );
  // 6. Verify guest can also access (using base connection without auth)
  const guestConnection: api.IConnection = { host: connection.host };
  const guestCommunity = await api.functional.redditClone.communities.at(
    guestConnection,
    {
      communityId: community.id,
    },
  );
  typia.assert(guestCommunity);
}