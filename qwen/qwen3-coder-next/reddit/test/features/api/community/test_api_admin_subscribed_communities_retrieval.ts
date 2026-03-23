import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_admin_subscribed_communities_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // Create multiple communities as admin
  const communityNames = ["sports", "technology", "gaming", "music"];
  const createdCommunities: IRedditLikeCommunity[] = [];
  for (const name of communityNames) {
    const icon = RandomGenerator.pick([
      "https://example.com/icon1.png",
      "https://example.com/icon2.png",
    ]);
    const community = await api.functional.redditLike.member.communities.create(
      adminConnection,
      {
        body: {
          name: name,
          icon_url: icon,
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
    typia.assert(community);
    createdCommunities.push(community);
  }
  // Subscribe to some communities as admin
  await api.functional.redditLike.member.communities.update(adminConnection, {
    communityName: createdCommunities[0].name,
    body: {},
  });
  await api.functional.redditLike.member.communities.update(adminConnection, {
    communityName: createdCommunities[2].name,
    body: {},
  });
  // Retrieve subscribed communities
  const result =
    await api.functional.redditLike.admin.communities.my.index(adminConnection);
  typia.assert(result);
  // Validate response structure
  TestValidator.equals("pagination exists", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.equals("pagination records", result.pagination.records, 2);
  TestValidator.equals("pagination pages", result.pagination.pages, 1);
  // Validate only subscribed communities are returned
  TestValidator.equals("subscribed count", result.data.length, 2);
  // Verify returned communities match subscribed ones
  const returnedNames = result.data.map((c) => c.name);
  TestValidator.predicate(
    "contains first subscribed",
    returnedNames.includes(createdCommunities[0].name),
  );
  TestValidator.predicate(
    "contains third subscribed",
    returnedNames.includes(createdCommunities[2].name),
  );
  TestValidator.notEquals(
    "does not contain unsubscribed",
    returnedNames.includes(createdCommunities[1].name),
    true,
  );
  TestValidator.notEquals(
    "does not contain another unsubscribed",
    returnedNames.includes(createdCommunities[3].name),
    true,
  );
  // Verify community summary fields
  result.data.forEach((community) => {
    TestValidator.equals("has name", typeof community.name, "string");
    TestValidator.equals(
      "has icon_url",
      community.icon_url === null || typeof community.icon_url === "string",
      true,
    );
    TestValidator.predicate(
      "has non-negative subscriber_count",
      community.subscriber_count >= 0,
    );
  });
}