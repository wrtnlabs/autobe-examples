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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunitiesCommunityIdModerationRoles(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationRole.IRequest;
}): Promise<IPageICommunityPlatformModerationRole.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        owner_id: true,
      },
    });
  const callerRoles =
    await MyGlobal.prisma.community_platform_moderation_roles.findMany({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        role_type: true,
      },
    });
  const callerIsOwner = community.owner_id === props.member.id;
  const callerIsModerator = callerRoles.some(
    (role) => role.role_type === "moderator",
  );
  if (!callerIsOwner && !callerIsModerator) {
    throw new HttpException("Forbidden", 403);
  }
  const allowedRoleTypes: ReadonlyArray<string> = ["owner", "moderator"];
  if (!allowedRoleTypes.includes(props.body.roleType)) {
    throw new HttpException("Invalid role type", 400);
  }
  const targetMember =
    await MyGlobal.prisma.community_platform_members.findUnique({
      where: { id: props.body.communityPlatformMemberId },
      select: { id: true, deleted_at: true },
    });
  if (targetMember === null || targetMember.deleted_at !== null) {
    throw new HttpException("Member not found", 400);
  }
  if (
    props.body.communityPlatformMemberId === community.owner_id &&
    props.body.roleType !== "owner"
  ) {
    throw new HttpException("Cannot downgrade community owner", 400);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing = await prisma.community_platform_moderation_roles.findFirst(
      {
        where: {
          community_platform_community_id: props.communityId,
          community_platform_member_id: props.body.communityPlatformMemberId,
          role_type: props.body.roleType,
        },
        select: {
          id: true,
          deleted_at: true,
        },
      },
    );
    const timestamp: string = new Date().toISOString();
    if (existing === null) {
      await prisma.community_platform_moderation_roles.create({
        data: {
          id: v4(),
          community: {
            connect: {
              id: props.communityId,
            },
          },
          member: {
            connect: {
              id: props.body.communityPlatformMemberId,
            },
          },
          role_type: props.body.roleType,
          created_at: new Date(timestamp),
          updated_at: new Date(timestamp),
          deleted_at: null,
        },
      });
    } else if (existing.deleted_at !== null) {
      await prisma.community_platform_moderation_roles.update({
        where: { id: existing.id },
        data: {
          deleted_at: null,
          updated_at: new Date(timestamp),
        },
      });
    }
  });
  const whereInput = {
    community_platform_community_id: props.communityId,
    deleted_at: null,
  } satisfies Prisma.community_platform_moderation_rolesWhereInput;
  const total = await MyGlobal.prisma.community_platform_moderation_roles.count(
    {
      where: whereInput,
    },
  );
  const rows =
    await MyGlobal.prisma.community_platform_moderation_roles.findMany({
      where: whereInput,
      orderBy: {
        created_at: "asc",
      },
      skip: (page - 1) * limit,
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
  return {
    data: rows.map((row) => ({
      id: row.id,
      community: {
        id: row.community.id,
        name: row.community.name,
        description: row.community.description,
        iconImageUrl: row.community.icon_image_url,
        status: row.community.status,
        owner: {
          id: row.community.owner.id,
        } satisfies ICommunityPlatformMember.ISummary,
        created_at: row.community.created_at.toISOString(),
        updated_at: row.community.updated_at.toISOString(),
        deleted_at:
          row.community.deleted_at === null
            ? null
            : row.community.deleted_at.toISOString(),
      } satisfies ICommunityPlatformCommunity.ISummary,
      member: {
        id: row.member.id,
      } satisfies ICommunityPlatformMember.ISummary,
      role_type: row.role_type,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      deleted_at: row.deleted_at === null ? null : row.deleted_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
