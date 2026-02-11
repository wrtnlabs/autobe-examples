import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
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

/**
 * Tests fetching paginated comments for a post within a community.
 * 1. Registers a new member
 * 2. Creates a community
 * 3. Creates a post in the community
 * 4. Fetches comments for the post
 * 5. Validates response structure matches IPageICommunityComment.ISummary
 */
export async function test_api_post_comments_fetch_success(
  connection: api.IConnection,
) {
  // 1. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
      } satisfies ICommunityMember.IJoin,
    },
  );
  // 2. Create community
  const community: ICommunityCommunity = 
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  // 3. Create post in community
  const post: ICommunityPost = 
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          type: "text",
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPost.ICreate,
      },
    );
  // 4. Fetch comments for post
  const comments: IPageICommunityComment.ISummary = 
    await api.functional.community.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityComment.IRequest,
    });
  typia.assert(comments);
}