import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostCollector } from "../collectors/CommunityPlatformPostCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminPosts(props: {
  admin: AdminPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<void> {
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { id: props.admin.id, deleted_at: null },
  });
  if (admin === null) throw new HttpException("Forbidden", 403);
  const member = await MyGlobal.prisma.community_platform_members.findFirst({
    where: { session_id: props.admin.session_id, deleted_at: null } as any,
  });
  if (member === null) throw new HttpException("Forbidden", 403);
  if (props.body.title.trim().length === 0) {
    throw new HttpException("Missing title", 400);
  }
  const postType = props.body.post_type;
  if (postType !== "text" && postType !== "link" && postType !== "image") {
    throw new HttpException("Invalid post_type", 400);
  }
  if (postType === "text") {
    if (
      props.body.body_text === undefined ||
      props.body.body_text.trim().length === 0
    ) {
      throw new HttpException("Missing body_text", 400);
    }
  }
  if (postType === "link") {
    if (
      props.body.link === undefined ||
      props.body.link.href.trim().length === 0
    ) {
      throw new HttpException("Missing link.href", 400);
    }
  }
  if (postType === "image") {
    if (props.body.image === undefined) {
      throw new HttpException("Missing image", 400);
    }
    if (props.body.image.attachments.length < 1) {
      throw new HttpException("Missing image attachments", 400);
    }
  }
  const memberEntity: IEntity = { id: member.id } satisfies IEntity;
  const isSubscribed =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        community_id: props.body.community_id,
        member_id: memberEntity.id,
        deleted_at: null,
      },
    });
  if (isSubscribed === null) throw new HttpException("Forbidden", 403);
  const isBanned =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_id: props.body.community_id,
        deleted_at: null,
      },
    });
  if (isBanned !== null) throw new HttpException("Forbidden", 403);
  const isoNow = toISOStringSafe(new Date());
  const now = isoNow as string & tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.community_platform_posts.create({
      data: await CommunityPlatformPostCollector.collect({
        body: props.body,
        communityPlatformMembers: memberEntity,
      }),
    });
    if (postType === "link") {
      await tx.community_platform_post_links.create({
        data: {
          id: v4(),
          community_platform_post_id: created.id,
          href: props.body.link!.href as string & tags.Format<"uri">,
          display_title: props.body.link!.display_title,
          display_description: props.body.link!.display_description,
          deleted_at: null,
          created_at: now,
          updated_at: now,
        },
      });
    }
    if (postType === "image") {
      await tx.community_platform_post_images.createMany({
        data: props.body.image!.attachments.map((a) => ({
          id: v4(),
          community_platform_post_id: created.id,
          file_url: a.file_url as string & tags.Format<"uri">,
          content_type: a.content_type,
          file_size_bytes: a.file_size_bytes as number & tags.Type<"int32">,
          image_width_px: a.image_width_px as number & tags.Type<"int32">,
          image_height_px: a.image_height_px as number & tags.Type<"int32">,
          alt_text: a.alt_text,
          sort_order: a.sort_order as number & tags.Type<"int32">,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      });
    }
  });
}
