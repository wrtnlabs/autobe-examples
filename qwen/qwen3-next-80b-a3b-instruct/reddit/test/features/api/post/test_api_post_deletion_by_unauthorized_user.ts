import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_deletion_by_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member A's account and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(memberA);
  // Step 2: Member A creates a community
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Member A creates a post in the community
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberAConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: community.id,
        post_type: "text",
      },
    });
  typia.assert(post);
  // Step 4: Create member B's account and authenticate (unauthorized user)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(memberB);
  // Step 5: Member B attempts to delete post created by member A (should fail with 403)
  await TestValidator.error(
    "unauthorized user cannot delete another user's post",
    async () => {
      await api.functional.communityBbs.member.posts.erase(memberBConnection, {
        postId: post.id,
      });
    },
  );
}
