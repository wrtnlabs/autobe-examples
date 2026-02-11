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

class FakeClass {}
export async function test_api_post_delete_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    } satisfies ICommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Community creation
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(1) + " Community",
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(community);
  // 3. Post creation
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Post deletion
  await api.functional.community.member.posts.erase(memberConnection, {
    postId: post.id,
  });
}
