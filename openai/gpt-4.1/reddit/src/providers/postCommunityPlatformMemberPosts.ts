import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberPosts(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  // 1. Ensure target community exists & is not soft-deleted or banned
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.body.community_platform_community_id,
        deleted_at: null,
        status: {
          notIn: ["banned", "archived"],
        },
      },
    });
  if (!community) {
    throw new HttpException("Community does not exist or is unavailable", 404);
  }

  // 2. Enforce unique title within the community (Prisma unique constraint)
  const existing = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      community_platform_community_id:
        props.body.community_platform_community_id,
      title: props.body.title,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException(
      "A post with this title already exists in the community",
      409,
    );
  }

  // 3. Default status to 'published' if not provided (unless business/mode logic overrides)
  const now = toISOStringSafe(new Date());
  const postStatus = props.body.status ?? "published";

  // 4. Insert post
  const created = await MyGlobal.prisma.community_platform_posts.create({
    data: {
      id: v4(),
      community_platform_member_id: props.member.id,
      community_platform_community_id:
        props.body.community_platform_community_id,
      title: props.body.title,
      content_body: props.body.content_body ?? null,
      content_type: props.body.content_type,
      status: postStatus,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 5. Map nullable DB to API contract (content_body: null->undefined, deleted_at: null->undefined)
  return {
    id: created.id,
    community_platform_member_id: created.community_platform_member_id,
    community_platform_community_id: created.community_platform_community_id,
    title: created.title,
    content_body:
      created.content_body === null ? undefined : created.content_body,
    content_type: created.content_type,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
