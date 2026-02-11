import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_member_post_image_unsubscribed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_community_owner_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  typia.assert(ownerAuthorized);
  // 2. Login as community owner
  await authorize_community_owner_login(ownerConnection, {
    body: {
      email: typeof ownerConnection.headers?.Authorization === 'string' ? ownerConnection.headers?.Authorization.split(' ')[1] : typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 3. Create a community
  const community =
    await generate_random_reddit_community_community_owner_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 5. Login as member
  await authorize_member_login(memberConnection, {
    body: {
      email: typeof memberConnection.headers?.Authorization === 'string' ? memberConnection.headers?.Authorization.split(' ')[1] : typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 6. Attempt to create image post in unsubscribed community (expect 403)
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  await TestValidator.httpError(
    "POST_COMMUNITY_SUBSCRIPTION_REQUIRED",
    403,
    async () => {
      await api.functional.redditCommunity.member.posts.create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.name(),
            communityName: community.name,
            imageUrl: imageUrl,
          } satisfies IRedditCommunityPost.ICreate,
        },
      );
    },
  );
}