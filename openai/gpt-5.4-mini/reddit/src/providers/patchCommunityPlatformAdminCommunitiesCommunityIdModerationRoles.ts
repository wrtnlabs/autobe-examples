import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationRole";
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

export async function patchCommunityPlatformAdminCommunitiesCommunityIdModerationRoles(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationRole.IRequest;
}): Promise<IPageICommunityPlatformModerationRole.ISummary> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        owner_id: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Community is deleted", 404);
  }
  const callerRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.admin.id,
        deleted_at: null,
        role_type: {
          in: ["Owner", "Moderator"],
        },
      },
      select: {
        id: true,
        role_type: true,
      },
    });
  if (community.owner_id !== props.admin.id && callerRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.roleType !== "Owner" && props.body.roleType !== "Moderator") {
    throw new HttpException("Invalid role type", 400);
  }
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: props.body.communityPlatformMemberId },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (member === null || member.deleted_at !== null) {
    throw new HttpException("Member not found", 404);
  }
  if (
    props.body.roleType === "Owner" &&
    community.owner_id !== props.body.communityPlatformMemberId
  ) {
    throw new HttpException("Invalid owner assignment", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.body.communityPlatformMemberId,
        deleted_at: null,
      },
      select: {
        id: true,
        role_type: true,
      },
    });
    if (existing === null) {
      await tx.community_platform_moderation_roles.create({
        data: {
          id: v4(),
          community: { connect: { id: props.communityId } },
          member: { connect: { id: props.body.communityPlatformMemberId } },
          role_type: props.body.roleType,
          created_at: new globalThis.Date(),
          updated_at: new globalThis.Date(),
          deleted_at: null,
        },
      });
    } else if (existing.role_type !== props.body.roleType) {
      await tx.community_platform_moderation_roles.update({
        where: { id: existing.id },
        data: {
          role_type: props.body.roleType,
          updated_at: new globalThis.Date(),
        },
      });
    }
  });
  const page =
    props.body.page === undefined || props.body.page === null
      ? 1
      : props.body.page;
  const limit =
    props.body.limit === undefined || props.body.limit === null
      ? 100
      : props.body.limit;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.community_platform_moderation_roles.findMany({
      where: {
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_image_url: true,
            status: true,
            owner: {
              select: {
                id: true,
              },
            },
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        member: {
          select: {
            id: true,
          },
        },
        role_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total = await MyGlobal.prisma.community_platform_moderation_roles.count(
    {
      where: {
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
    },
  );
  return {
    data: await ArrayUtil.asyncMap(data, async (record) => ({
      id: record.id,
      community: {
        id: record.community.id,
        name: record.community.name,
        description: record.community.description,
        iconImageUrl: record.community.icon_image_url,
        status: record.community.status,
        owner: {
          id: record.community.owner.id,
        },
        created_at: record.community.created_at.toISOString(),
        updated_at: record.community.updated_at.toISOString(),
        deleted_at:
          record.community.deleted_at === null
            ? null
            : record.community.deleted_at.toISOString(),
      },
      member: {
        id: record.member.id,
      },
      role_type: record.role_type,
      created_at: record.created_at.toISOString(),
      updated_at: record.updated_at.toISOString(),
      deleted_at:
        record.deleted_at === null ? null : record.deleted_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
