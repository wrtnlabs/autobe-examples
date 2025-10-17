import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { IPageICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformCommunitiesCommunityIdImages(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityImage.IRequest;
}): Promise<IPageICommunityPlatformCommunityImage> {
  const { communityId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = body.sort_by === "order" ? "order" : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // created_at date range logic
  let createdAtCond: { gte?: string; lte?: string } | undefined = undefined;
  if (body.created_after !== undefined && body.created_before !== undefined) {
    createdAtCond = { gte: body.created_after, lte: body.created_before };
  } else if (body.created_after !== undefined) {
    createdAtCond = { gte: body.created_after };
  } else if (body.created_before !== undefined) {
    createdAtCond = { lte: body.created_before };
  }

  const where = {
    community_id: communityId,
    deleted_at: null,
    ...(body.image_type !== undefined && { image_type: body.image_type }),
    ...(body.active !== undefined && { active: body.active }),
    ...(body.order !== undefined && { order: body.order }),
    ...(createdAtCond !== undefined && { created_at: createdAtCond }),
  };

  const total = await MyGlobal.prisma.community_platform_community_images.count(
    {
      where,
    },
  );

  const rows =
    await MyGlobal.prisma.community_platform_community_images.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((img) => ({
      id: img.id,
      community_id: img.community_id,
      file_upload_id: img.file_upload_id,
      image_type: img.image_type,
      order: img.order ?? null,
      alt_text: img.alt_text ?? null,
      active: img.active,
      created_at: toISOStringSafe(img.created_at),
      updated_at: toISOStringSafe(img.updated_at),
      deleted_at: img.deleted_at ? toISOStringSafe(img.deleted_at) : null,
    })),
  };
}
