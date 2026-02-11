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

export async function test_api_community_post_image(
  connection: api.IConnection,
) {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    } satisfies ICommunityMember.IJoin,
  });
  const community: ICommunityCommunity =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: `https://s3.amazonaws.com/${RandomGenerator.alphabets(10)}.jpg`,
        },
      },
    );
  const post: ICommunityPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          type: "image",
          image_url: `https://s3.amazonaws.com/${RandomGenerator.alphabets(10)}.jpg`,
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals("post type should be image", post.type, "image");
  TestValidator.equals("community ID matches", post.community.id, community.id);
}