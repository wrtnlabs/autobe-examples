import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
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

export async function test_api_post_update_by_author_text_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community (the member becomes owner automatically)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community (required before posting)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Create a text-type post in the community
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        type: "text",
        title: originalTitle,
        body: originalBody,
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // -- MAIN TEST: Update both title and body --
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedBody = RandomGenerator.content({ paragraphs: 1 });
  const updatedPost = await api.functional.community.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: updatedTitle,
        body: updatedBody,
      } satisfies ICommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // Assert updated title matches
  TestValidator.equals(
    "updated title matches",
    updatedPost.title,
    updatedTitle,
  );
  // Assert content is text type with updated body
  // Use 'type' in guard since IImageContent lacks the 'type' discriminator
  if ("type" in updatedPost.content && updatedPost.content.type === "text") {
    TestValidator.equals(
      "content type is text",
      updatedPost.content.type,
      "text",
    );
    TestValidator.equals(
      "updated body matches",
      updatedPost.content.body,
      updatedBody,
    );
  } else {
    throw new Error("Expected text content type after updating a text post");
  }
  // Assert updatedAt >= createdAt
  TestValidator.predicate(
    "updatedAt >= createdAt",
    new Date(updatedPost.updatedAt) >= new Date(updatedPost.createdAt),
  );
  // Assert author.id corresponds to the authenticated member
  TestValidator.equals(
    "author id matches member",
    updatedPost.author.id,
    member.id,
  );
  // Assert voteScore is 0 and commentCount is 0
  TestValidator.equals("voteScore is 0", updatedPost.voteScore, 0);
  TestValidator.equals("commentCount is 0", updatedPost.commentCount, 0);
  // Assert deletedAt is null
  TestValidator.equals("deletedAt is null", updatedPost.deletedAt, null);
  // -- EDGE CASE 1: Update only the title, omit body → body should be preserved --
  const titleOnlyUpdate = RandomGenerator.paragraph({ sentences: 2 });
  const titleOnlyUpdatedPost =
    await api.functional.community.member.posts.update(memberConnection, {
      postId: post.id,
      body: {
        title: titleOnlyUpdate,
      } satisfies ICommunityPost.IUpdate,
    });
  typia.assert(titleOnlyUpdatedPost);
  TestValidator.equals(
    "title-only update: title changed",
    titleOnlyUpdatedPost.title,
    titleOnlyUpdate,
  );
  if (
    "type" in titleOnlyUpdatedPost.content &&
    titleOnlyUpdatedPost.content.type === "text"
  ) {
    TestValidator.equals(
      "title-only update: body preserved",
      titleOnlyUpdatedPost.content.body,
      updatedBody,
    );
  } else {
    throw new Error(
      "Expected text content type after title-only update on a text post",
    );
  }
  // -- EDGE CASE 2: Update only the body, omit title → title should be preserved --
  const bodyOnlyUpdate = RandomGenerator.content({ paragraphs: 1 });
  const bodyOnlyUpdatedPost =
    await api.functional.community.member.posts.update(memberConnection, {
      postId: post.id,
      body: {
        body: bodyOnlyUpdate,
      } satisfies ICommunityPost.IUpdate,
    });
  typia.assert(bodyOnlyUpdatedPost);
  TestValidator.equals(
    "body-only update: title preserved",
    bodyOnlyUpdatedPost.title,
    titleOnlyUpdate,
  );
  if (
    "type" in bodyOnlyUpdatedPost.content &&
    bodyOnlyUpdatedPost.content.type === "text"
  ) {
    TestValidator.equals(
      "body-only update: body changed",
      bodyOnlyUpdatedPost.content.body,
      bodyOnlyUpdate,
    );
  } else {
    throw new Error(
      "Expected text content type after body-only update on a text post",
    );
  }
  // -- EDGE CASE 3: Providing url, image_url, thumbnail_url for text post has no observable effect --
  const titleWithExtraFields = RandomGenerator.paragraph({ sentences: 2 });
  const extraFieldsPost = await api.functional.community.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: titleWithExtraFields,
        url: typia.random<string & tags.Format<"uri">>(),
        image_url: typia.random<string & tags.Format<"uri">>(),
        thumbnail_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPost.IUpdate,
    },
  );
  typia.assert(extraFieldsPost);
  // Should still be text type with title updated
  TestValidator.equals(
    "extra fields: title updated",
    extraFieldsPost.title,
    titleWithExtraFields,
  );
  if (
    "type" in extraFieldsPost.content &&
    extraFieldsPost.content.type === "text"
  ) {
    TestValidator.equals(
      "extra fields: content type still text",
      extraFieldsPost.content.type,
      "text",
    );
  } else {
    throw new Error(
      "Expected text content type to be preserved when irrelevant fields are provided",
    );
  }
}
