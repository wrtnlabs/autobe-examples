import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminPostsNew(props: {
  admin: AdminPayload;
  body: ICommunityPost.ICreate;
}): Promise<ICommunityPost> {
  // Create base post with only schema-defined fields
  const createdPost = await MyGlobal.prisma.community_posts.create({
    data: {
      id: v4(),
      title: "", // Required field, empty default
      content_type: "text", // Required field, default to text
      community_member_id: props.admin.id, // Required field from admin identity
      community_id: "", // Required field, empty default
      community_post_status_id: "approved", // Required field, default status
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  // Return the created post with only the fields defined in community_posts schema
  return {
    id: createdPost.id,
    title: createdPost.title,
    content_type: createdPost.content_type,
    created_at: createdPost.created_at,
    updated_at: createdPost.updated_at,
    deleted_at: createdPost.deleted_at,
  };
}
