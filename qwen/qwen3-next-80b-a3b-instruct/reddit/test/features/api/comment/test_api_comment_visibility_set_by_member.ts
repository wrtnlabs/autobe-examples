import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_communities_posts_new_create } from "../../../generate/generate_random_community_platform_communities_posts_new_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_comment_visibility_set_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member user for own comment
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    },
  });
  typia.assert(member1);
  // Step 2: Create second member user
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    },
  });
  typia.assert(member2);
  // Step 3: Create moderator user
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    },
  });
  typia.assert(moderator);
  // Step 4: Create a community
  const communityCode = RandomGenerator.alphaNumeric(8);
  await api.functional.communityPlatform.communities.posts._new.create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        text: RandomGenerator.content({ paragraphs: 1 }),
      },
      communityCode,
    },
  );
  // Step 5: Member1 creates a post in the community
  const post =
    await api.functional.communityPlatform.communities.posts._new.create(
      member1Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          text: RandomGenerator.content({ paragraphs: 1 }),
        },
        communityCode,
      },
    );
  typia.assert(post);
  // Step 6: Member1 creates a comment on the post
  const member1Comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      member1Connection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(member1Comment);
  // Step 7: Member1 sets visibility of their own comment to visible - MUST succeed
  await api.functional.communityPlatform.moderator.posts.comments.visibilities.setVisibility(
    member1Connection,
    {
      postId: post.id,
      commentId: member1Comment.id,
    },
  );
  // Step 8: Member1 sets visibility of their own comment again - idempotent test, MUST still succeed
  await api.functional.communityPlatform.moderator.posts.comments.visibilities.setVisibility(
    member1Connection,
    {
      postId: post.id,
      commentId: member1Comment.id,
    },
  );
  // Step 9: Member2 creates a comment on the same post
  const member2Comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      member2Connection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(member2Comment);
  // Step 10: Member1 tries to set visibility of Member2's comment - MUST fail (403 Forbidden)
  await TestValidator.error(
    "member cannot set another member's comment visibility",
    async () => {
      await api.functional.communityPlatform.moderator.posts.comments.visibilities.setVisibility(
        member1Connection,
        {
          postId: post.id,
          commentId: member2Comment.id,
        },
      );
    },
  );
  // Step 11: Moderator sets visibility of Member1's comment to visible - MUST succeed
  await api.functional.communityPlatform.moderator.posts.comments.visibilities.setVisibility(
    moderatorConnection,
    {
      postId: post.id,
      commentId: member1Comment.id,
    },
  );
  // Step 12: Moderator sets visibility of Member2's comment to visible - MUST succeed
  await api.functional.communityPlatform.moderator.posts.comments.visibilities.setVisibility(
    moderatorConnection,
    {
      postId: post.id,
      commentId: member2Comment.id,
    },
  );
}
