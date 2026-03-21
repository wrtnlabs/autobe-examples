import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_post_creation_text_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member via POST /redditClone/auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMemberSession.IJoin,
  });
  typia.assert(authorized);
  // Create authenticated connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // 2. Create a community via POST /redditClone/member/communities with unique name
  const community =
    await generate_random_reddit_clone_member_communities_create(
      authenticatedConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community via POST /redditClone/member/subscriptions
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      authenticatedConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post via POST /redditClone/member/posts
  const postTitle = RandomGenerator.name(3);
  const post = await api.functional.redditClone.member.posts.create(
    authenticatedConnection,
    {
      body: {
        title: postTitle,
        communityName: community.name,
        type: "text" as const,
      } satisfies IRedditClonePostLink.ICreate,
    },
  );
  typia.assert(post);
  // Validate response
  TestValidator.equals("post has UUID id", post.id.length, 36);
  TestValidator.equals("vote_score is 0", post.vote_score, 0);
  TestValidator.equals("comment_count is 0", post.comment_count, 0);
  TestValidator.equals(
    "author matches authenticated member",
    post.author.id,
    authorized.id,
  );
  TestValidator.equals(
    "community matches target",
    post.community.id,
    community.id,
  );
  TestValidator.equals("type is text", post.type, "text");
  TestValidator.predicate(
    "created_at is set",
    post.created_at !== undefined && post.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is set",
    post.updated_at !== undefined && post.updated_at !== null,
  );
}
