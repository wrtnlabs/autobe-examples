import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_creation_link(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const email = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create link post with member authentication
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers ??= {};
  postConnection.headers.Authorization = memberAuth.token.access;
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postUrl = typia.random<string & tags.Format<"url">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        community_id: communityId,
        post_type: "link",
        url: postUrl,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Validate post creation
  TestValidator.equals("vote_score is 0", post.vote_score, 0);
  TestValidator.equals("comment_count is 0", post.comment_count, 0);
  TestValidator.equals("post_type is link", post.post_type, "link");
  TestValidator.equals(
    "title length within limit",
    post.title.length <= 300,
    true,
  );
  TestValidator.equals("post is not deleted", post.deleted_at, null);
  // Validate content
  if (
    post.content.post_type === "link" &&
    "url" in post.content &&
    "domain_name" in post.content
  ) {
    const urlAsString = postUrl satisfies string as string;
    TestValidator.equals("content url matches", post.content.url, urlAsString);
    TestValidator.predicate(
      "domain_name is non-empty",
      post.content.domain_name.length > 0,
    );
  }
  // Validate timestamp
  const createdTime = new Date(post.created_at);
  const now = new Date();
  TestValidator.predicate(
    "created_at is recent",
    createdTime.getTime() > now.getTime() - 1000,
  );
}
