import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostTextTransformer } from "../transformers/CommunityPlatformPostTextTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostIdTextsTextId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  textId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostText.IUpdate;
}): Promise<ICommunityPlatformPostText> {
  // Validate post exists and member is author
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_member_id: true,
        content_type: true,
      },
    },
  );
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (post.content_type !== "TEXT") {
    throw new HttpException("Post is not TEXT type", 400);
  }
  // Validate text content entry exists and belongs to the post
  const text =
    await MyGlobal.prisma.community_platform_post_texts.findUniqueOrThrow({
      where: { id: props.textId },
      select: { id: true, community_platform_post_id: true },
    });
  if (text.community_platform_post_id !== props.postId) {
    throw new HttpException(
      "Text content does not belong to specified post",
      400,
    );
  }
  // Update text content
  await MyGlobal.prisma.community_platform_post_texts.update({
    where: { id: props.textId },
    data: {
      ...(props.body.content !== undefined && {
        content: props.body.content,
        content_length: props.body.content.length,
      }),
      ...(props.body.formatting !== undefined && {
        formatting: props.body.formatting,
      }),
    },
  });
  // Update post's updated_at
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: { updated_at: new Date() },
  });
  // Fetch and return updated text content
  const updated =
    await MyGlobal.prisma.community_platform_post_texts.findUniqueOrThrow({
      where: { id: props.textId },
      ...CommunityPlatformPostTextTransformer.select(),
    });
  return await CommunityPlatformPostTextTransformer.transform(updated);
}
