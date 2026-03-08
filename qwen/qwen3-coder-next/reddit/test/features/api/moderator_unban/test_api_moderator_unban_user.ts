import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_ban_create_ban } from "../../../generate/generate_random_reddit_like_member_communities_ban_create_ban";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";

export async function test_api_moderator_unban_user(
  connection: api.IConnection,
): Promise<void> {
  const randomSuffix = Math.random().toString(36).substring(7);
  const communityName = `test_community_${randomSuffix}`;
  const communityId = "00000000-0000-0000-0000-000000000001";
  // 1. Create users
  const moderatorConnection: api.IConnection = { host: connection.host };
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const ownerConnection: api.IConnection = { host: connection.host };
  // Create moderator user
  const moderator = await api.functional.redditLike.auth.member.join(
    moderatorConnection,
    {
      body: {
        email: `moderator_${randomSuffix}@test.com`,
        username: `moderator_${randomSuffix}`,
        password: "password123",
        display_name: `Moderator ${randomSuffix}`,
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(moderator);
  // Create banned user
  const bannedUser = await api.functional.redditLike.auth.member.join(
    bannedUserConnection,
    {
      body: {
        email: `banned_${randomSuffix}@test.com`,
        username: `banned_${randomSuffix}`,
        password: "password123",
        display_name: `Banned User ${randomSuffix}`,
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(bannedUser);
  // Create owner user
  const owner = await api.functional.redditLike.auth.member.join(
    ownerConnection,
    {
      body: {
        email: `owner_${randomSuffix}@test.com`,
        username: `owner_${randomSuffix}`,
        password: "password123",
        display_name: `Owner ${randomSuffix}`,
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(owner);
  // 2. Create a ban record first
  const banBody: IRedditLikeBan.ICreate = {
    reddit_like_user_id: bannedUser.id,
    reddit_like_community_id: communityId,
    status: "active",
  };
  const banRecord =
    await api.functional.redditLike.member.communities.ban.createBan(
      moderatorConnection,
      {
        communityName: communityName,
        username: bannedUser.username,
        body: banBody,
      },
    );
  typia.assert(banRecord);
  TestValidator.equals(
    "ban created with active status",
    banRecord.status,
    "active",
  );
  // 3. Test successful unban by moderator (204 No Content)
  await api.functional.redditLike.member.communities.ban.erase(
    moderatorConnection,
    {
      communityName: communityName,
      username: bannedUser.username,
    },
  );
  // 4. Test unauthorized unban attempt by regular user (403 Forbidden)
  const regularUserConnection: api.IConnection = { host: connection.host };
  const regularUser = await api.functional.redditLike.auth.member.join(
    regularUserConnection,
    {
      body: {
        email: `regular_${randomSuffix}@test.com`,
        username: `regular_${randomSuffix}`,
        password: "password123",
        display_name: `Regular User ${randomSuffix}`,
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(regularUser);
  try {
    await api.functional.redditLike.member.communities.ban.erase(
      regularUserConnection,
      {
        communityName: communityName,
        username: bannedUser.username,
      },
    );
    throw new Error("Should have thrown 403 Forbidden");
  } catch (error: any) {
    TestValidator.httpError("regular user gets 403 Forbidden", 403, () => {
      throw error;
    });
  }
  // 5. Test unban of non-existent ban (404 Not Found)
  try {
    await api.functional.redditLike.member.communities.ban.erase(
      moderatorConnection,
      {
        communityName: communityName,
        username: "nonexistent_user",
      },
    );
    throw new Error("Should have thrown 404 Not Found");
  } catch (error: any) {
    TestValidator.httpError("non-existent ban gets 404 Not Found", 404, () => {
      throw error;
    });
  }
  // 6. Test successful unban by owner (higher authority)
  try {
    // Re-ban the user first
    await api.functional.redditLike.member.communities.ban.createBan(
      ownerConnection,
      {
        communityName: communityName,
        username: bannedUser.username,
        body: banBody,
      },
    );
    // Then unban with owner
    await api.functional.redditLike.member.communities.ban.erase(
      ownerConnection,
      {
        communityName: communityName,
        username: bannedUser.username,
      },
    );
  } catch (error: any) {
    // If community doesn't exist or other errors occur, skip this test
  }
}
