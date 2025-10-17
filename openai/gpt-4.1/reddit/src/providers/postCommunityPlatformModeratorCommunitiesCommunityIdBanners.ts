import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanner";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdBanners(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBanner.ICreate;
}): Promise<ICommunityPlatformCommunityBanner> {
  const { moderator, communityId, body } = props;
  // 1. Confirm the target community exists and is not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: communityId,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community does not exist or is deleted.", 404);
  }

  // 2. Confirm moderator is assigned to this community, active and not deleted
  const assignment =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
      {
        where: {
          member_id: moderator.id,
          community_id: communityId,
          end_at: null,
        },
      },
    );
  if (!assignment) {
    throw new HttpException(
      "You are not authorized to add banners to this community.",
      403,
    );
  }

  // 3. Confirm file_upload_id exists (file upload) and not deleted
  const file = await MyGlobal.prisma.community_platform_file_uploads.findFirst({
    where: {
      id: body.file_upload_id,
      deleted_at: null,
      status: "active",
    },
  });
  if (!file) {
    throw new HttpException(
      "Referenced file_upload_id does not exist or is not active.",
      400,
    );
  }

  // 4. Prevent duplicate banner order in this community (if order provided)
  if (body.order !== undefined) {
    const duplicateOrder =
      await MyGlobal.prisma.community_platform_community_banners.findFirst({
        where: {
          community_id: communityId,
          order: body.order,
          deleted_at: null,
        },
      });
    if (duplicateOrder) {
      throw new HttpException(
        "A banner with the specified order already exists in this community.",
        409,
      );
    }
  }

  const now = toISOStringSafe(new Date());
  const bannerId = v4();
  const created =
    await MyGlobal.prisma.community_platform_community_banners.create({
      data: {
        id: bannerId,
        community_id: communityId,
        file_upload_id: body.file_upload_id,
        order: body.order ?? undefined,
        alt_text: body.alt_text ?? undefined,
        active: body.active,
        created_at: now,
        updated_at: now,
        // deleted_at omitted (null/undefined)
      },
    });
  return {
    id: created.id,
    community_id: created.community_id,
    file_upload_id: created.file_upload_id,
    order: created.order ?? undefined,
    alt_text: created.alt_text ?? undefined,
    active: created.active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
