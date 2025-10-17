import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorPosts(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_posts.create({
    data: {
      id: v4(),
      community_platform_member_id: props.moderator.id,
      community_platform_community_id:
        props.body.community_platform_community_id,
      title: props.body.title,
      content_body: props.body.content_body ?? undefined,
      content_type: props.body.content_type,
      status: props.body.status ?? "published",
      created_at: now,
      updated_at: now,
    },
  });
  // Return response matching ICommunityPlatformPost
  return {
    id: created.id,
    community_platform_member_id: created.community_platform_member_id,
    community_platform_community_id: created.community_platform_community_id,
    title: created.title,
    content_body: created.content_body ?? undefined,
    content_type: created.content_type,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    // Omit deleted_at unless present (should be undefined/null on create)
    ...(created.deleted_at !== null && {
      deleted_at: toISOStringSafe(created.deleted_at),
    }),
  };
}
