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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_community_owner_delete_own_post(
  connection: api.IConnection,
): Promise<void> {
  // Create community owner account and store credentials
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const communityOwner: IRedditCommunityCommunityOwner.IAuthorized =
    await authorize_community_owner_join(communityOwnerConnection, {
      body: {
        email: joinEmail,
        password: joinPassword,
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    });
  // Authenticate community owner
  await authorize_community_owner_login(communityOwnerConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // Create a post in community 'general' (assumed to exist)
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(
      communityOwnerConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          communityName: "general",
          textContent: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  // Delete the post using community owner connection
  const deletedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.communityOwner.posts.erase(
      communityOwnerConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(deletedPost);
  // Verify the deleted post matches the original post
  TestValidator.equals("deleted post matches original", deletedPost, post);
}
