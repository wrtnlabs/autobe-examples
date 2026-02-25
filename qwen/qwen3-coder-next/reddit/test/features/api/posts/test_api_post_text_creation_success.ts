import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentSubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";

export async function test_api_post_text_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo: IRedditCloneMember.IAuthorized =
    await api.functional.redditClone.auth.member.join(memberConnection, {
      body: typia.random<IRedditCloneMember.IJoin>(),
    });
  typia.assert(memberInfo);
  // Update connection with authentication token
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberInfo.token.access,
  };
  // 2. Create a community for the post
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerInfo: IRedditCloneMember.IAuthorized =
    await api.functional.redditClone.auth.member.join(ownerConnection, {
      body: typia.random<IRedditCloneMember.IJoin>(),
    });
  typia.assert(ownerInfo);
  ownerConnection.headers = {
    ...ownerConnection.headers,
    Authorization: ownerInfo.token.access,
  };
  // 3. Member subscribes to the community
  const community =
    await api.functional.redditClone.member.communities.subscribe.patchByCommunityid(
      ownerConnection,
      {
        communityId: RandomGenerator.alphaNumeric(36) as string &
          tags.Format<"uuid">,
        body: typia.random<IRedditCloneContentSubscription.ISubscribeRequest>(),
      },
    );
  typia.assert(community);
  // 4. Create text post
  const textPost = await api.functional.redditClone.member.posts.create(
    memberConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.communityId,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(textPost);
  // 5. Validate post properties
  TestValidator.equals("author id", textPost.author.id, memberInfo.id);
  TestValidator.equals(
    "community id",
    textPost.community.id,
    community.communityId,
  );
  TestValidator.equals("vote_score", textPost.vote_score, 0);
  TestValidator.equals("comment_count", textPost.comment_count, 0);
  TestValidator.predicate(
    "created_at exists",
    textPost.created_at !== undefined,
  );
}
