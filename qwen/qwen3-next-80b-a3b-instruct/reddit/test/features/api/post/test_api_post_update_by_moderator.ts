import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // 2. Create community moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: (() => {
      let password = RandomGenerator.alphaNumeric(16);
      if (!/[0-9]/.test(password)) password = password.replace(/\D/, "1");
      if (!/[!@#$%^&*]/.test(password))
        password = password.replace(/[^0-9a-zA-Z]/, "!");
      return password;
    })(),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    { body: moderatorData },
  );
  typia.assert(moderator);
  // 3. Create post by member in community
  const postConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(postConnection, {
    body: { email: memberData.email, password: memberData.password },
  });
  const createdPost =
    await generate_random_reddit_community_member_posts_create(postConnection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        community_id: moderator.community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  typia.assert(createdPost);
  // 4. Moderator updates the post
  const updateConnection: api.IConnection = { host: connection.host };
  await authorize_community_moderator_login(updateConnection, {
    body: { email: moderatorData.email, password: moderatorData.password },
  });
  const newTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const newContent = RandomGenerator.paragraph({ sentences: 5 });
  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    updateConnection,
    {
      postId: createdPost.id,
      body: {
        title: newTitle,
        content: newContent,
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 5. Verify updates were applied correctly
  TestValidator.equals("post title updated", updatedPost.title, newTitle);
  TestValidator.equals("post content updated", updatedPost.content, newContent);
  TestValidator.equals("post url unchanged", updatedPost.url, createdPost.url);
  TestValidator.equals(
    "post image_url unchanged",
    updatedPost.image_url,
    createdPost.image_url,
  );
  TestValidator.equals(
    "post author unchanged",
    updatedPost.author.id,
    createdPost.author.id,
  );
  TestValidator.equals(
    "post community unchanged",
    updatedPost.community.id,
    createdPost.community.id,
  );
  TestValidator.equals(
    "post vote_score unchanged",
    updatedPost.vote_score,
    createdPost.vote_score,
  );
  TestValidator.equals(
    "post comment_count unchanged",
    updatedPost.comment_count,
    createdPost.comment_count,
  );
  TestValidator.predicate("updated_at is newer than created_at", () => {
    return (
      new Date(updatedPost.updated_at).getTime() >
      new Date(createdPost.created_at).getTime()
    );
  });
  // 6. Test moderator rejects title > 300 characters (length constraint)
  const tooLongTitle = RandomGenerator.paragraph({
    sentences: 50,
    wordMin: 10,
    wordMax: 15,
  }); // Generates far above 300 chars
  await TestValidator.error(
    "moderator cannot update with title > 300 chars",
    async () => {
      await api.functional.redditCommunity.member.posts.update(
        updateConnection,
        {
          postId: createdPost.id,
          body: {
            title: tooLongTitle,
          } satisfies IRedditCommunityPost.IUpdate,
        },
      );
    },
  );
  // 7. Test moderator rejects invalid URL format
  await TestValidator.error(
    "moderator cannot update with invalid URL format",
    async () => {
      await api.functional.redditCommunity.member.posts.update(
        updateConnection,
        {
          postId: createdPost.id,
          body: {
            url: "invalid-url",
          } satisfies IRedditCommunityPost.IUpdate,
        },
      );
    },
  );
  // 8. Test non-moderator cannot update post (authorization)
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(nonModeratorConnection, {
    body: { email: memberData.email, password: memberData.password },
  });
  await TestValidator.error("non-moderator cannot update post", async () => {
    await api.functional.redditCommunity.member.posts.update(
      nonModeratorConnection,
      {
        postId: createdPost.id,
        body: {
          title: "should fail",
        } satisfies IRedditCommunityPost.IUpdate,
      },
    );
  });
  // 9. Test moderator cannot change post type (immutable fields)
  await TestValidator.error("moderator cannot change post type", async () => {
    // Try to set a URL when content exists (would change type)
    await api.functional.redditCommunity.member.posts.update(updateConnection, {
      postId: createdPost.id,
      body: {
        title: newTitle,
        content: newContent,
        url: "https://example.com",
      } satisfies IRedditCommunityPost.IUpdate,
    });
  });
  // 10. Test moderator cannot change community_id (immutable fields)
  await TestValidator.error(
    "moderator cannot change community_id",
    async () => {
      await api.functional.redditCommunity.member.posts.update(
        updateConnection,
        {
          postId: createdPost.id,
          body: {
            title: "should fail",
          } satisfies IRedditCommunityPost.IUpdate,
        },
      );
    },
  );
}
