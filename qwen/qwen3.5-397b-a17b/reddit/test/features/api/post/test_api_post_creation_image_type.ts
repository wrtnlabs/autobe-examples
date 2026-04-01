import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test creating an image post with uploaded image path.
 *
 * This test validates the complete image post creation workflow:
 * 1. Register a new member account
 * 2. Create a community for the post
 * 3. Subscribe the member to the community
 * 4. Create an image post with title and image_path
 * 5. Validate post properties match expected values for image-type posts
 */
export async function test_api_post_creation_image_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community using utility function
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe member to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create image post
  const imagePost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "image",
        image_path: `/storage/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
      },
    },
  );
  typia.assert(imagePost);
  // 5. Validate image post properties
  TestValidator.equals("post type", imagePost.post_type, "image");
  TestValidator.predicate(
    "image path is string",
    typeof imagePost.image_path === "string",
  );
  TestValidator.predicate(
    "image path contains storage path",
    imagePost.image_path!.includes("/storage/images/"),
  );
  TestValidator.equals(
    "author matches member",
    imagePost.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community matches",
    imagePost.community.id,
    community.id,
  );
  TestValidator.predicate("vote score initialized", imagePost.vote_score === 0);
  TestValidator.predicate(
    "comments count initialized",
    imagePost.comments_count === 0,
  );
  TestValidator.predicate(
    "created_at is date-time string",
    typeof imagePost.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is date-time string",
    typeof imagePost.updated_at === "string",
  );
}
