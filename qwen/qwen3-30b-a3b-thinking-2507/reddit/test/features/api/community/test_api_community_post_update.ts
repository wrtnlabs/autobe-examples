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

export async function test_api_community_post_update(
  connection: api.IConnection,
) {
  // 1. Auth as community member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: RandomGenerator.alphabets(10) + "@test.com",
      username: RandomGenerator.name(),
    } satisfies ICommunityMember.IJoin,
  });
  typia.assert(memberJoin);
  // 2. Create community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies ICommunityCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create text post in community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 15,
        }),
        content: RandomGenerator.paragraph(),
        type: "text",
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Update post with valid title and content
  const updatedPost = await api.functional.community.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 10,
          wordMax: 15,
        }) satisfies string & tags.MaxLength<150> as string,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 5. Validate update
  TestValidator.equals("title matches", updatedPost.title, post.title);
  TestValidator.equals("content matches", updatedPost.content, post.content);
  TestValidator.predicate(
    "timestamps updated",
    updatedPost.updated_at !== post.updated_at,
  );
}