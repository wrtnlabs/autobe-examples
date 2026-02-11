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

export async function test_api_community_post_text(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community
  const community = await generate_random_community_member_communities_create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(community);
  // 2. Register and authenticate as member
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    },
  });
  // 3. Create text post in community
  const post = await api.functional.community.member.communities.posts.create(
    userConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 4. Validate post creation
  TestValidator.equals("post title matches", post.title, post.title);
  TestValidator.predicate("post type is text", post.type === "text");
  TestValidator.predicate(
    "content exists",
    post.content !== null && post.content !== undefined,
  );
}
