import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanner";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminCommunitiesCommunityIdBanners(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBanner.ICreate;
}): Promise<ICommunityPlatformCommunityBanner> {
  // 1. Check that the target community exists and not soft-deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  if (!community)
    throw new HttpException(
      "Target community does not exist or has been deleted",
      404,
    );

  // 2. Check that the file_upload_id exists, is not soft-deleted
  const fileUpload =
    await MyGlobal.prisma.community_platform_file_uploads.findFirst({
      where: {
        id: props.body.file_upload_id,
        deleted_at: null,
      },
    });
  if (!fileUpload)
    throw new HttpException(
      "Referenced file does not exist or has been deleted",
      404,
    );

  // 3. Check for duplicate banner for this file in this community
  const duplicateFileBanner =
    await MyGlobal.prisma.community_platform_community_banners.findFirst({
      where: {
        community_id: props.communityId,
        file_upload_id: props.body.file_upload_id,
        deleted_at: null,
      },
    });
  if (duplicateFileBanner) {
    throw new HttpException(
      "A banner for this file already exists for this community",
      409,
    );
  }

  // 4. If order is specified, check for duplicate order for this community
  if (props.body.order !== undefined && props.body.order !== null) {
    const duplicateOrder =
      await MyGlobal.prisma.community_platform_community_banners.findFirst({
        where: {
          community_id: props.communityId,
          order: props.body.order,
          deleted_at: null,
        },
      });
    if (duplicateOrder) {
      throw new HttpException(
        "A banner already exists for this display order in the community",
        409,
      );
    }
  }

  // 5. Generate UUID and timestamps (as strings)
  const now = toISOStringSafe(new Date());
  const id = v4();

  // 6. Insert row
  const created =
    await MyGlobal.prisma.community_platform_community_banners.create({
      data: {
        id: id,
        community_id: props.communityId,
        file_upload_id: props.body.file_upload_id,
        order: props.body.order ?? undefined,
        alt_text: props.body.alt_text ?? undefined,
        active: props.body.active,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    });

  // 7. Format and return response with all proper null/undefined handling (matching DTO)
  return {
    id: created.id,
    community_id: created.community_id,
    file_upload_id: created.file_upload_id,
    order:
      created.order !== null && created.order !== undefined
        ? created.order
        : undefined,
    alt_text:
      created.alt_text !== null && created.alt_text !== undefined
        ? created.alt_text
        : undefined,
    active: created.active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== undefined
        ? created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
