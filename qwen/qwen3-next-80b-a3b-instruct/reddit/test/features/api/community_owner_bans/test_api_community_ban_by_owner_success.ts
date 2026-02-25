import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_owner_bans_create } from "../../../generate/generate_random_reddit_community_community_owner_bans_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_ban_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityOwner.IJoin;
  const owner = await authorize_community_owner_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(owner);
  // 2. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // 3. Create community context
  const communityConnection: api.IConnection = { host: connection.host };
  // Use owner's token to create community
  communityConnection.headers = ownerConnection.headers;
  const community =
    await api.functional.redditCommunity.member.communities.create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Ban the member from the community
  const banConnection: api.IConnection = { host: connection.host };
  // Use owner's token to create ban
  banConnection.headers = ownerConnection.headers;
  const reason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 10,
    wordMax: 40,
  })
    .substring(0, RandomGenerator.alphabets(1).length + 10) // 10-500 chars
    .trim();
  const ban =
    await generate_random_reddit_community_community_owner_bans_create(
      banConnection,
      {
        body: {
          user_id: member.id,
          reason: reason,
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Since the ban endpoint returns IRedditCommunityCommunity (not IRedditCommunityBan),
  // we validate that the returned community object reflects the expected structure.
  // The ban operation should have returned the community object with the same properties.
  TestValidator.equals("community id matches", ban.id, community.id);
  TestValidator.equals("community name is preserved", ban.name, community.name);
  TestValidator.equals(
    "community description is preserved",
    ban.description,
    community.description,
  );
  TestValidator.equals("community owner id matches", ban.owner?.id, owner.id);
  TestValidator.predicate("community has valid creation date", () => {
    const date = new Date(ban.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("community has valid update date", () => {
    const date = new Date(ban.updated_at);
    return !isNaN(date.getTime());
  });
  // 6. Verify ban takes immediate effect - member cannot create new community
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = memberConnection.headers; // Use member's token
  await TestValidator.httpError(
    "member cannot create post after ban",
    403,
    async () => {
      await api.functional.redditCommunity.member.communities.create(
        postConnection,
        {
          body: {
            name: RandomGenerator.alphabets(8),
            description: RandomGenerator.paragraph({ sentences: 1 }),
            icon_url: null,
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );
}
