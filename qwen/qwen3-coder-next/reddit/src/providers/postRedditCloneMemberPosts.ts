import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneContentPostTransformer } from "../transformers/RedditCloneContentPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPosts(props: {
  member: MemberPayload;
  body: IRedditCloneContentPost.ICreate;
}): Promise<IRedditCloneContentPost> {
  // Validate community exists
  const community = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: {
      id: props.body.community_id,
    },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Check community subscription
  const subscription =
    await MyGlobal.prisma.reddit_clone_content_subscriptions.findFirst({
      where: {
        community_id: props.body.community_id,
        member_id: props.member.id,
      },
    });
  if (!subscription) {
    throw new HttpException(
      "You must be subscribed to this community to post",
      403,
    );
  }
  // Build nested type-specific records
  const postTextInput =
    props.body.type === "text"
      ? {
          create: {
            id: v4(),
            text: props.body.content ?? "",
            content: props.body.content ?? "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            author: { connect: { id: props.member.id } },
          },
        }
      : undefined;
  const linkInput =
    props.body.type === "link"
      ? {
          create: {
            id: v4(),
            url: props.body.url ?? "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }
      : undefined;
  const imageInput =
    props.body.type === "image"
      ? {
          create: {
            id: v4(),
            image_url: props.body.imageUrl ?? "",
          },
        }
      : undefined;
  // Create post with correct nested relations
  const createdPost = await MyGlobal.prisma.reddit_clone_content_posts.create({
    data: {
      id: v4(),
      type: props.body.type,
      title: props.body.title,
      content: props.body.content ?? props.body.url ?? null,
      image_url: props.body.imageUrl ?? null,
      vote_score: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      author: { connect: { id: props.member.id } },
      community: { connect: { id: community.id } },
      postText: postTextInput,
      link: linkInput,
      image: imageInput,
    },
    ...RedditCloneContentPostTransformer.select(),
  });
  return await RedditCloneContentPostTransformer.transform(createdPost);
}
