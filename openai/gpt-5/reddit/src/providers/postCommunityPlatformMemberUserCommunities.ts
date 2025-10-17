import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postCommunityPlatformMemberUserCommunities(props: {
  memberUser: MemberuserPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  const { memberUser, body } = props;

  // Authorization: ensure the caller is an active member and user is not soft-deleted
  const membership =
    await MyGlobal.prisma.community_platform_member_users.findFirst({
      where: {
        community_platform_user_id: memberUser.id,
        deleted_at: null,
        user: { deleted_at: null },
      },
      select: { id: true },
    });
  if (membership === null) {
    throw new HttpException(
      "Forbidden: Only active members can create communities",
      403,
    );
  }

  // Business rule: auto_archive_days must be >= 30
  if (body.auto_archive_days < 30) {
    throw new HttpException(
      "Bad Request: auto_archive_days must be at least 30",
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  const communityId = v4() as string & tags.Format<"uuid">;
  const ownerId = v4() as string & tags.Format<"uuid">;

  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const createdCommunity = await tx.community_platform_communities.create({
        data: {
          id: communityId,
          name: body.name,
          display_name: body.display_name ?? null,
          description: body.description ?? null,
          visibility: body.visibility,
          nsfw: body.nsfw,
          auto_archive_days: body.auto_archive_days,
          language: body.language ?? null,
          region: body.region ?? null,
          quarantined: false,
          created_at: now,
          updated_at: now,
        },
      });

      await tx.community_platform_community_owners.create({
        data: {
          id: ownerId,
          community_platform_user_id: memberUser.id,
          community_platform_community_id: createdCommunity.id,
          assigned_at: now,
          revoked_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });

      return createdCommunity;
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      name: created.name,
      display_name: created.display_name ?? null,
      description: created.description ?? null,
      visibility: created.visibility,
      nsfw: created.nsfw,
      auto_archive_days: created.auto_archive_days as number &
        tags.Type<"int32">,
      language: created.language ?? null,
      region: created.region ?? null,
      quarantined: created.quarantined,
      quarantined_at: created.quarantined_at
        ? toISOStringSafe(created.quarantined_at)
        : null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        throw new HttpException("Conflict: Community name already exists", 409);
      }
    }
    throw err;
  }
}
