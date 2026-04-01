import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
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
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_community_member_id: true,
    },
  });
  if (post.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.text_content !== undefined && {
        text_content: props.body.text_content,
      }),
      ...(props.body.link_url !== undefined && {
        link_url: props.body.link_url,
      }),
      ...(props.body.image_path !== undefined && {
        image_path: props.body.image_path,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...RedditCommunityPostTransformer.select(),
    });
  return await RedditCommunityPostTransformer.transform(updated);
}
