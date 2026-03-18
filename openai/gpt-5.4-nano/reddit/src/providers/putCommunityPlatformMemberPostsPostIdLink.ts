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

export async function putCommunityPlatformMemberPostsPostIdLink(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdateLink;
}): Promise<ICommunityPlatformPost> {
  const href = props.body.href;
  if (href.trim().length === 0) {
    throw new HttpException("Missing href", 400);
  }
  try {
    // eslint-disable-next-line no-new
    new URL(href);
  } catch {
    throw new HttpException("Invalid href", 400);
  }
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        deleted_at: true,
        post_type: true,
        author_id: true,
        link_url: true,
      },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (post.post_type !== "link") {
    throw new HttpException("Post is not link type", 400);
  }
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as unknown as string & tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_post_links.upsert({
      where: {
        community_platform_post_id: props.postId,
      },
      create: {
        id: v4(),
        community_platform_post_id: props.postId,
        href,
        display_title: props.body.display_title ?? "",
        display_description: props.body.display_description ?? "",
        deleted_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
      update: {
        href,
        deleted_at: null,
        ...(props.body.display_title !== undefined
          ? { display_title: props.body.display_title }
          : {}),
        ...(props.body.display_description !== undefined
          ? { display_description: props.body.display_description }
          : {}),
        updated_at: nowIso,
      },
    });
    await tx.community_platform_posts.update({
      where: { id: props.postId },
      data: {
        link_url: href,
        edited_by_id: props.member.id,
        edited_at: nowIso,
      },
      select: { id: true },
    });
  });
  const updated =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
  return await CommunityPlatformPostTransformer.transform(updated);
}
