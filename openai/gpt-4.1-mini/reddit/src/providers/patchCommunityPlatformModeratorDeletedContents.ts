import { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeletedContent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorDeletedContents(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformDeletedContent.IRequest;
}): Promise<IPageICommunityPlatformDeletedContent.ISummary> {
  const rawPage = (props.body as any)?.page;
  const page = typeof rawPage === "number" && rawPage >= 1 ? rawPage : 1;
  const rawLimit = (props.body as any)?.limit;
  const limit = typeof rawLimit === "number" && rawLimit >= 1 ? rawLimit : 100;
  const skip = (page - 1) * limit;
  const whereInput = {};
  const data =
    await MyGlobal.prisma.community_platform_deleted_contents.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        moderator: {
          select: { id: true, display_name: true },
        },
        user: {
          select: { id: true, display_name: true },
        },
        post_id: true,
        comment_id: true,
        reason: true,
        created_at: true,
        updated_at: true,
      },
    });
  const total = await MyGlobal.prisma.community_platform_deleted_contents.count(
    {
      where: whereInput,
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      moderator_id: record.moderator.id,
      moderator_display_name:
        record.moderator.display_name !== null
          ? record.moderator.display_name
          : null,
      user_id: record.user.id,
      user_display_name:
        record.user.display_name !== null ? record.user.display_name : null,
      post_id: record.post_id !== null ? record.post_id : null,
      comment_id: record.comment_id !== null ? record.comment_id : null,
      reason: record.reason !== null ? record.reason : null,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
