import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
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
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostIdTextsTextId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  textId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_member_id: true,
        post_type: true,
        status: true,
        deleted_at: true,
      },
    },
  );
  const text =
    await MyGlobal.prisma.community_platform_post_texts.findUniqueOrThrow({
      where: { id: props.textId },
      select: {
        id: true,
        community_platform_post_id: true,
        deleted_at: true,
      },
    });
  if (text.community_platform_post_id !== post.id) {
    throw new HttpException(
      "Text content does not belong to the specified post",
      400,
    );
  }
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (post.post_type !== "text") {
    throw new HttpException("This endpoint only supports text posts", 400);
  }
  if (post.deleted_at !== null || text.deleted_at !== null) {
    throw new HttpException("Post is not editable", 400);
  }
  if (post.status !== "active") {
    throw new HttpException("Post is not editable", 400);
  }
  if (props.body.target_url !== undefined || props.body.image !== undefined) {
    throw new HttpException(
      "This endpoint only accepts text post updates",
      400,
    );
  }
  if (props.body.title === undefined && props.body.body === undefined) {
    throw new HttpException("No editable fields were provided", 400);
  }
  const now: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new globalThis.Date().toISOString());
  return await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_posts.update({
      where: { id: props.postId },
      data: {
        ...(props.body.title !== undefined ? { title: props.body.title } : {}),
        updated_at: now,
      },
    });
    await tx.community_platform_post_texts.update({
      where: { id: props.textId },
      data: {
        ...(props.body.body !== undefined ? { body: props.body.body } : {}),
        updated_at: now,
      },
    });
    const updated = await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
    return await CommunityPlatformPostTransformer.transform(updated);
  });
}
