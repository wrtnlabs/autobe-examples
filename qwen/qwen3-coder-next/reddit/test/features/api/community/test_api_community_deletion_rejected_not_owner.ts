import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_deletion_rejected_not_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: RandomGenerator.name() + "@test.com",
      password: RandomGenerator.alphaNumeric(10),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create community as owner
  const communityName = "test_community_" + RandomGenerator.alphaNumeric(6);
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: communityName,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);
  // 3. Create second member as non-owner
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: RandomGenerator.name() + "@test.com",
      password: RandomGenerator.alphaNumeric(10),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(nonOwner);
  // 4. Attempt deletion by non-owner - expect 403 Forbidden
  await TestValidator.error("non-owner deletion rejected", async () => {
    await api.functional.redditLike.member.communities.erase(
      nonOwnerConnection,
      {
        name: communityName,
      },
    );
  });
  // 5. Verify community still exists and owner unchanged
  const verifiedCommunity =
    await api.functional.redditLike.member.communities.create(ownerConnection, {
      body: { name: communityName } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(verifiedCommunity);
  TestValidator.equals(
    "community still owned by original owner",
    verifiedCommunity.owner.id,
    owner.member.id,
  );
}
