import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPostImageMutation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImageMutation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPostsPostIdImages(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostImage.IRequest;
}): Promise<ICommunityPlatformPostImage.ISummary> {
  const prisma = MyGlobal.prisma as any;
  const post = await prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, owner_member_id: true, post_type: true },
  });
  if (!post) throw new HttpException("Not Found", 404);
  if (post.owner_member_id !== props.member.id)
    throw new HttpException("Forbidden", 403);
  const active = await prisma.community_platform_post_images.findMany({
    where: { community_platform_post_id: props.postId, deleted_at: null },
    select: {
      id: true,
      file_url: true,
      content_type: true,
      file_size_bytes: true,
      image_width_px: true,
      image_height_px: true,
      alt_text: true,
      sort_order: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const activeIds = new Set(active.map((x: any) => x.id));
  const mutations = (props.body as any).mutations as any[];
  await prisma.$transaction(async (tx: any) => {
    const now = new Date();
    const toRemove = mutations.filter(
      (m: any) => (m.mutationType ?? m.type) === "remove",
    );
    const toUpdate = mutations.filter(
      (m: any) => (m.mutationType ?? m.type) === "update",
    );
    const toAdd = mutations.filter(
      (m: any) => (m.mutationType ?? m.type) === "add",
    );
    for (const m of toRemove) {
      const id = m.id ?? m.image_id ?? m.post_image_id;
      if (!activeIds.has(id)) throw new HttpException("Bad Request", 400);
      await tx.community_platform_post_images.update({
        where: { id },
        data: { deleted_at: now, updated_at: now },
      });
    }
    for (const m of toUpdate) {
      const id = m.id ?? m.image_id ?? m.post_image_id;
      if (!activeIds.has(id)) throw new HttpException("Bad Request", 400);
      const data = m.data ?? m;
      await tx.community_platform_post_images.update({
        where: { id },
        data: {
          file_url: data.file_url,
          content_type: data.content_type,
          file_size_bytes: data.file_size_bytes,
          image_width_px: data.image_width_px,
          image_height_px: data.image_height_px,
          alt_text: data.alt_text,
          sort_order: data.sort_order,
          updated_at: now,
        },
      });
    }
    for (const m of toAdd) {
      const data = m.data ?? m;
      await tx.community_platform_post_images.create({
        data: {
          id: v4(),
          community_platform_post_id: props.postId,
          file_url: data.file_url,
          content_type: data.content_type,
          file_size_bytes: data.file_size_bytes,
          image_width_px: data.image_width_px,
          image_height_px: data.image_height_px,
          alt_text: data.alt_text,
          sort_order: data.sort_order,
          deleted_at: null,
          created_at: now,
          updated_at: now,
        },
      });
    }
    const finalActive = await tx.community_platform_post_images.findMany({
      where: { community_platform_post_id: props.postId, deleted_at: null },
      select: { id: true },
    });
    if (post.post_type === "image" && finalActive.length < 1) {
      throw new HttpException("Bad Request", 400);
    }
  });
  const finalImages = await prisma.community_platform_post_images.findMany({
    where: { community_platform_post_id: props.postId, deleted_at: null },
    select: {
      id: true,
      file_url: true,
      content_type: true,
      file_size_bytes: true,
      image_width_px: true,
      image_height_px: true,
      alt_text: true,
      sort_order: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
    orderBy: { sort_order: "asc" },
  });
  const first = finalImages[0];
  if (!first) throw new HttpException("Bad Request", 400);
  return {
    id: first.id,
    file_url: first.file_url,
    content_type: first.content_type,
    file_size_bytes: first.file_size_bytes,
    image_width_px: first.image_width_px,
    image_height_px: first.image_height_px,
    alt_text: first.alt_text,
    sort_order: first.sort_order,
    created_at: toISOStringSafe(first.created_at),
    updated_at: toISOStringSafe(first.updated_at),
    deleted_at: null,
  };
}
