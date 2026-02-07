import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTextContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostTextContentTransformer } from "../transformers/CommunityPlatformPostTextContentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformPostsPostIdTextTextContentId(props: {
  postId: string & tags.Format<"uuid">;
  textContentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostTextContent> {
  const record =
    await MyGlobal.prisma.community_platform_post_text_contents.findUnique({
      where: {
        id: props.textContentId,
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        content: true,
        preview: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: {
          select: {
            id: true,
            title: true,
            content_type: true,
            created_at: true,
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                icon_url: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                owner: true,
              },
            },
            author: true,
            _count: true, // Added required _count property
          },
        },
      },
    });
  if (!record) {
    throw new HttpException("Text content not found", 404);
  }
  return await CommunityPlatformPostTextContentTransformer.transform(record);
}
