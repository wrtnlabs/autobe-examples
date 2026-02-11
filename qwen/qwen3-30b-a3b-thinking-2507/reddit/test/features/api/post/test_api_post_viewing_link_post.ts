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

export async function test_api_post_viewing_link_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
    },
  });
  // 2. Create community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  // 3. Create link post
  const linkPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: "Test link post",
          content: "This is a test link post",
          url: "https://youtube.com/watch?v=example",
          type: "link",
        },
      },
    );
  typia.assert(linkPost);
  // 4. Verify post details
  const post = await api.functional.community.posts.at(memberConnection, {
    postId: linkPost.id,
  });
  typia.assert(post);
  // Validate domain extraction
  if (post && post.url) {
    const domain = new URL(post.url).hostname;
    TestValidator.equals("Domain matches expected", domain, "youtube.com");
  } else {
    throw new Error("URL field is missing from post");
  }
  // Verify author details
  TestValidator.equals("Author match", post.author.id, authResult.id);
  // Verify community info
  TestValidator.equals("Community match", post.community.id, community.id);
}
