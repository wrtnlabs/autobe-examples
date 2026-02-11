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

export async function test_api_community_post_link(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create random member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
        description: typia.random<string & tags.MaxLength<500>>(),
        icon_url:
          `https://example.com/${typia.random<string>()}` satisfies string &
            tags.Format<"uri">,
      } satisfies ICommunityCommunity.ICreate,
    },
  );
  // 3. Create link post
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<150>>(),
        type: "link",
        url: `https://example.com/${typia.random<string>()}` satisfies string &
          tags.Format<"uri">,
      },
    },
  );
  // 4. Validate URL domain
  const url = new URL(post.url!);
  TestValidator.equals("domain name matches", url.hostname, "example.com");
}
