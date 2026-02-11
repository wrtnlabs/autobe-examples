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

export async function test_api_post_viewing_text_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Create community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      },
    },
  );
  // 3. Create text post
  const textContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 10,
  });
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.name(2),
        type: "text" as const,
        content: textContent,
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Verify post details
  const retrievedPost = await api.functional.community.posts.at(connection, {
    postId: post.id,
  });
  typia.assert(retrievedPost);
  // Verify content is truncated to 200 characters
  const contentWithoutTruncation = retrievedPost.content;
  TestValidator.equals(
    "Post content should be truncated to 200 characters",
    contentWithoutTruncation?.length,
    200,
  );
  // Verify author and community details are present
  TestValidator.notEquals("Author should exist", retrievedPost.author, null);
  TestValidator.notEquals(
    "Community should exist",
    retrievedPost.community,
    null,
  );
}