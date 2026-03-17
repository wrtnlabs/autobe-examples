import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostTransformer } from "../transformers/RedditCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IUpdate;
}): Promise<IRedditCommunityPost> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
    select: { id: true, author_id: true, post_type: true },
  });
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: {
      title: props.body.title,
      updated_at: new Date(),
    },
  });
  if (post.post_type === "text" && props.body.text_post_body !== undefined) {
    await MyGlobal.prisma.reddit_community_post_texts.update({
      where: { reddit_community_post_id: props.postId },
      data: { body: props.body.text_post_body, updated_at: new Date() },
    });
  }
  if (post.post_type === "link" && props.body.link_post_url !== undefined) {
    const url: string & tags.Format<"uri"> = props.body.link_post_url;
    const domain_name: string = (() => {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname;
      } catch {
        return "";
      }
    })();
    await MyGlobal.prisma.reddit_community_post_links.update({
      where: { reddit_community_post_id: props.postId },
      data: {
        url: url,
        domain_name: domain_name,
        updated_at: new Date(),
      },
    });
  }
  if (
    post.post_type === "image" &&
    props.body.image_id !== undefined &&
    props.body.image_id !== null
  ) {
    await MyGlobal.prisma.reddit_community_file_of_posts.upsert({
      where: {
        reddit_community_file_id: props.body.image_id,
        reddit_community_post_id: props.postId,
      },
      create: {
        id: v4(),
        reddit_community_file_id: props.body.image_id,
        reddit_community_post_id: props.postId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      update: {
        reddit_community_file_id: props.body.image_id,
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  const result = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      ...RedditCommunityPostTransformer.select(),
    },
  );
  return await RedditCommunityPostTransformer.transform(result);
}
