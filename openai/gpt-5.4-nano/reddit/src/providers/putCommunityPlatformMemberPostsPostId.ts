import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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

export async function putCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  const existing =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        author_id: true,
        title: true,
        body: true,
        post_type: true,
        link_url: true,
        image_cover_url: true,
        image_alt_text: true,
      },
    });
  if (existing.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const nextTitle = props.body.title;
  if (nextTitle === undefined || nextTitle.trim().length === 0) {
    throw new HttpException("Invalid title", 400);
  }
  const nextPostType = props.body.post_type ?? existing.post_type;
  const isText = nextPostType === "text";
  const isLink = nextPostType === "link";
  const isImage = nextPostType === "image";
  if (!isText && !isLink && !isImage) {
    throw new HttpException("Invalid post type", 400);
  }
  const updateData: {
    title: string;
    body: string;
    post_type: string;
    link_url: string | null;
    image_cover_url: string | null;
    image_alt_text: string | null;
    edited_by_id: string & tags.Format<"uuid">;
    edited_at: Date;
    updated_at: Date;
  } = {
    title: nextTitle,
    body: existing.body,
    post_type: nextPostType,
    link_url: existing.link_url,
    image_cover_url: existing.image_cover_url,
    image_alt_text: existing.image_alt_text,
    edited_by_id: props.member.id,
    edited_at: new Date(),
    updated_at: new Date(),
  };
  if (isText) {
    const nextBody = props.body.body;
    if (nextBody === undefined || nextBody.trim().length === 0) {
      throw new HttpException("Invalid body", 400);
    }
    updateData.body = nextBody;
    updateData.link_url = null;
    updateData.image_cover_url = null;
    updateData.image_alt_text = null;
  } else if (isLink) {
    const nextLinkUrl = props.body.link_url;
    if (
      nextLinkUrl === undefined ||
      nextLinkUrl === null ||
      nextLinkUrl.trim().length === 0
    ) {
      throw new HttpException("Invalid link url", 400);
    }
    updateData.link_url = nextLinkUrl;
    updateData.image_cover_url = null;
    updateData.image_alt_text = null;
  } else {
    const nextImageCoverUrl = props.body.image_cover_url;
    if (
      nextImageCoverUrl === undefined ||
      nextImageCoverUrl === null ||
      nextImageCoverUrl.trim().length === 0
    ) {
      throw new HttpException("Invalid image cover url", 400);
    }
    updateData.image_cover_url = nextImageCoverUrl;
    updateData.link_url = null;
    updateData.image_alt_text =
      props.body.image_alt_text === undefined
        ? null
        : props.body.image_alt_text;
  }
  const nowIso = typia.assert<string & tags.Format<"date-time">>(
    new Date().toISOString(),
  );
  const updated = await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: {
      title: updateData.title,
      body: updateData.body,
      post_type: updateData.post_type,
      link_url: updateData.link_url,
      image_cover_url: updateData.image_cover_url,
      image_alt_text: updateData.image_alt_text,
      edited_by_id: updateData.edited_by_id,
      edited_at: new Date(nowIso),
      updated_at: new Date(nowIso),
    },
    select: CommunityPlatformPostTransformer.select().select,
  });
  return await CommunityPlatformPostTransformer.transform(updated);
}
