import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_member_post_text_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member by joining
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Subscribe member to a community
  const subscribeConnection: api.IConnection = { host: connection.host };
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      subscribeConnection,
      {
        body: {
          reddit_community_communities_id:
            typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(subscription);
  // 3. Create a text post
  const postConnection: api.IConnection = { host: connection.host };
  const post = await generate_random_reddit_community_member_posts_create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: subscription.community.id,
        text_content: RandomGenerator.content({ paragraphs: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Validate post creation
  TestValidator.equals("post id exists", post.id !== undefined, true);
  TestValidator.equals(
    "post title matches",
    post.title,
    RandomGenerator.paragraph({ sentences: 2 }),
  );
  TestValidator.equals("post_type is text", post.post_type, "text");
  TestValidator.equals(
    "text_content matches",
    post.text_content !== null,
    true,
  );
  TestValidator.equals(
    "community id matches",
    post.community.id,
    subscription.community.id,
  );
  TestValidator.equals("vote_score initialized to 0", post.vote_score, 0);
  TestValidator.equals("comment_count initialized to 0", post.comment_count, 0);
  TestValidator.equals("author id matches", post.author.id, member.id);
  TestValidator.predicate(
    "created_at is set",
    () => post.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    () => post.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", post.deleted_at, null);
}