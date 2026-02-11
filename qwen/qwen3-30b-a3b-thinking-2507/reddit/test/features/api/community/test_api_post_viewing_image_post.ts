import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_post_viewing_image_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Create community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  // 3. Create image post
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "image",
        image_url: `https://s3.amazonaws.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Verify post detail
  const retrievedPost = await api.functional.community.posts.at(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // 5. Validation
  TestValidator.equals(
    "Image URL matches",
    retrievedPost.image_url,
    post.image_url,
  );
  TestValidator.predicate(
    "Image URL meets S3 format",
    (retrievedPost.image_url?.startsWith("https://s3.amazonaws.com/")) === true,
  );
  TestValidator.predicate(
    "Image URL has correct S3 format",
    (retrievedPost.image_url?.endsWith(".jpg")) === true,
  );
  TestValidator.equals("Post type matches", retrievedPost.type, "image");
  TestValidator.equals("Post title matches", retrievedPost.title, post.title);
  TestValidator.predicate(
    "Thumbnail URL meets format requirements",
    (retrievedPost.image_url?.includes("/media/thumbnails/500px-")) === true,
  );
}