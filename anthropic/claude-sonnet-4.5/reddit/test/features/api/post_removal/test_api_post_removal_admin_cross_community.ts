import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_post_removal_admin_cross_community(
  connection: api.IConnection,
) {
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  const moderatorCount = 3;
  const moderators: IRedditLikeModerator.IAuthorized[] =
    await ArrayUtil.asyncRepeat(moderatorCount, async (index) => {
      const modData = {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeModerator.ICreate;

      const moderator: IRedditLikeModerator.IAuthorized =
        await api.functional.auth.moderator.join(connection, {
          body: modData,
        });
      typia.assert(moderator);
      return moderator;
    });

  const communities: IRedditLikeCommunity[] = await ArrayUtil.asyncRepeat(
    moderatorCount,
    async (index) => {
      const communityData = {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: RandomGenerator.pick([
          "technology",
          "gaming",
          "music",
          "sports",
          "news",
        ] as const),
      } satisfies IRedditLikeCommunity.ICreate;

      const community: IRedditLikeCommunity =
        await api.functional.redditLike.member.communities.create(connection, {
          body: communityData,
        });
      typia.assert(community);
      return community;
    },
  );

  const memberCount = 3;
  const members: IRedditLikeMember.IAuthorized[] = await ArrayUtil.asyncRepeat(
    memberCount,
    async (index) => {
      const memberData = {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeMember.ICreate;

      const member: IRedditLikeMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: memberData,
        });
      typia.assert(member);
      return member;
    },
  );

  const posts: IRedditLikePost[] = [];
  for (let i = 0; i < communities.length; i++) {
    const community = communities[i];
    const member = members[i % members.length];

    const postData = {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate;

    const post: IRedditLikePost =
      await api.functional.redditLike.admin.posts.create(connection, {
        body: postData,
      });
    typia.assert(post);
    posts.push(post);
  }

  for (const post of posts) {
    const removalData = {
      removal_type: "platform",
      reason_category: "spam",
      reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IRedditLikePost.IRemove;

    await api.functional.redditLike.admin.posts.remove(connection, {
      postId: post.id,
      body: removalData,
    });
  }

  TestValidator.predicate(
    "admin successfully removed posts from all communities",
    posts.length === communities.length,
  );
}
