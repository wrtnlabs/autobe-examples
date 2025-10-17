import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_post_update_in_community_by_authorized_member(
  connection: api.IConnection,
) {
  // 1. Member registration and authentication
  const memberBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberBody });
  typia.assert(member);

  // 2. Create a community
  const communityBody = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a post in the community
  const possiblePostTypes = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(possiblePostTypes);
  let postBody: IRedditCommunityPosts.ICreate;

  // Construct post body according to post type
  if (postType === "text") {
    postBody = {
      reddit_community_community_id: community.id,
      post_type: "text",
      title: RandomGenerator.paragraph({
        sentences: 6,
        wordMin: 3,
        wordMax: 7,
      }).slice(0, 300),
      body_text: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 10,
        sentenceMax: 20,
        wordMin: 4,
        wordMax: 8,
      }),
    } satisfies IRedditCommunityPosts.ICreate;
  } else if (postType === "link") {
    postBody = {
      reddit_community_community_id: community.id,
      post_type: "link",
      title: RandomGenerator.paragraph({ sentences: 4 }).slice(0, 300),
      link_url: `https://${RandomGenerator.alphabets(5)}.com/${RandomGenerator.alphabets(5)}`,
    } satisfies IRedditCommunityPosts.ICreate;
  } else {
    postBody = {
      reddit_community_community_id: community.id,
      post_type: "image",
      title: RandomGenerator.paragraph({ sentences: 5 }).slice(0, 300),
      image_url: `https://images.example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
    } satisfies IRedditCommunityPosts.ICreate;
  }

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      { communityId: community.id, body: postBody },
    );
  typia.assert(post);

  // 4. Update the post with new valid fields
  let updateBody: IRedditCommunityPosts.IUpdate = {
    title: `Updated ${RandomGenerator.paragraph({ sentences: 3 })}`.slice(
      0,
      300,
    ),
  };
  if (post.post_type === "text") {
    updateBody.body_text = RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 15,
    });
  } else if (post.post_type === "link") {
    updateBody.link_url = `https://${RandomGenerator.alphabets(7)}.org/${RandomGenerator.alphabets(6)}`;
  } else if (post.post_type === "image") {
    updateBody.image_url = `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(8)}.png`;
  }

  const updatedPost: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.updatePost(
      connection,
      { communityId: community.id, postId: post.id, body: updateBody },
    );
  typia.assert(updatedPost);

  // 5. Verify updates are reflected
  TestValidator.equals("updated post id", updatedPost.id, post.id);
  TestValidator.equals(
    "community id matches",
    updatedPost.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "title updated",
    updatedPost.title,
    updateBody.title ?? post.title,
  );

  if (post.post_type === "text") {
    TestValidator.equals(
      "body_text updated",
      updatedPost.body_text,
      updateBody.body_text,
    );
  } else if (post.post_type === "link") {
    TestValidator.equals(
      "link_url updated",
      updatedPost.link_url,
      updateBody.link_url,
    );
  } else if (post.post_type === "image") {
    TestValidator.equals(
      "image_url updated",
      updatedPost.image_url,
      updateBody.image_url,
    );
  }

  // Updated timestamp should be different and later than created
  TestValidator.predicate(
    "updated_at >= created_at",
    new Date(updatedPost.updated_at) >= new Date(updatedPost.created_at),
  );

  // 6. Check unauthorized update attempt fails
  // Create a second member
  const anotherMemberBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;
  const anotherMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: anotherMemberBody,
    });
  typia.assert(anotherMember);

  // Create a separate connection for unauthorized member using different token
  const anotherMemberConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: anotherMember.token.access },
  };

  // Attempt update on same post should fail with this member connection
  await TestValidator.error(
    "unauthorized member cannot update another's post",
    async () => {
      await api.functional.redditCommunity.member.communities.posts.updatePost(
        anotherMemberConnection,
        {
          communityId: community.id,
          postId: post.id,
          body: {
            title: "Unauthorized update",
          } satisfies IRedditCommunityPosts.IUpdate,
        },
      );
    },
  );

  // 7. Validate business logic: title length limit enforced
  const tooLongTitle = RandomGenerator.paragraph({ sentences: 100 }).slice(
    0,
    350,
  );
  await TestValidator.error("title length limit enforced", async () => {
    await api.functional.redditCommunity.member.communities.posts.updatePost(
      connection,
      {
        communityId: community.id,
        postId: post.id,
        body: { title: tooLongTitle } satisfies IRedditCommunityPosts.IUpdate,
      },
    );
  });
}
