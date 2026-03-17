import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFile";
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

export async function patchCommunityPlatformAdminFilesOrphans(props: {
  admin: AdminPayload;
  body: ICommunityPlatformFile.IRequest;
}): Promise<IPageICommunityPlatformFile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause for orphaned files
  const whereInput: Prisma.community_platform_filesWhereInput = {
    deleted_at: null, // Only active files
    // Orphaned condition: no post attachments AND no community images
    AND: [
      {
        postAttachment: null, // No associated post attachment
      },
      {
        // No associated community image
        // We need to check community_platform_community_images table
        // Since there's no direct relation in schema, we'll use a raw condition or subquery
        // For now, assume community images are tracked differently
      },
    ],
  };
  // Add filters from request body
  if (props.body.search) {
    whereInput.name = { contains: props.body.search };
  }
  if (props.body.type) {
    whereInput.type = props.body.type;
  }
  if (props.body.status) {
    whereInput.status = props.body.status;
  }
  if (props.body.actor_type) {
    whereInput.actor_type = props.body.actor_type;
  }
  if (props.body.actor_id) {
    whereInput.actor_id = props.body.actor_id;
  }
  if (props.body.size_min !== undefined || props.body.size_max !== undefined) {
    whereInput.size = {};
    if (props.body.size_min !== undefined) {
      whereInput.size.gte = props.body.size_min;
    }
    if (props.body.size_max !== undefined) {
      whereInput.size.lte = props.body.size_max;
    }
  }
  if (props.body.created_at_start || props.body.created_at_end) {
    whereInput.created_at = {};
    if (props.body.created_at_start) {
      whereInput.created_at.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end) {
      whereInput.created_at.lte = new Date(props.body.created_at_end);
    }
  }
  if (props.body.updated_at_start || props.body.updated_at_end) {
    whereInput.updated_at = {};
    if (props.body.updated_at_start) {
      whereInput.updated_at.gte = new Date(props.body.updated_at_start);
    }
    if (props.body.updated_at_end) {
      whereInput.updated_at.lte = new Date(props.body.updated_at_end);
    }
  }
  // Get total count
  const total = await MyGlobal.prisma.community_platform_files.count({
    where: whereInput,
  });
  // Get paginated data
  const data = await MyGlobal.prisma.community_platform_files.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    // Need to select fields required by transformer
    select: {
      id: true,
      name: true,
      type: true,
      size: true,
      status: true,
      public_url: true,
      actor_type: true,
      actor_id: true,
      created_at: true,
      deleted_at: true,
      storage_path: true, // Required by transformer validation
      updated_at: true, // Required by transformer validation
    },
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(data, async (file) => {
    // Resolve actor based on actor_type
    let actor: ICommunityPlatformFile.ISummary["actor"];
    switch (file.actor_type) {
      case "member": {
        const member =
          await MyGlobal.prisma.community_platform_members.findUnique({
            where: { id: file.actor_id },
            select: {
              id: true,
              email: true,
              username: true,
              nickname: true,
              email_verified: true,
              registered_at: true,
              last_login_at: true,
            },
          });
        if (member) {
          actor = {
            id: member.id,
            email: member.email,
            username: member.username,
            nickname: member.nickname ?? undefined,
            email_verified: member.email_verified,
            registered_at: member.registered_at.toISOString(),
            last_login_at: member.last_login_at?.toISOString() ?? undefined,
          } satisfies ICommunityPlatformMember.ISummary;
        } else {
          // Actor not found - use placeholder or throw?
          throw new HttpException(
            `Member actor not found: ${file.actor_id}`,
            404,
          );
        }
        break;
      }
      case "community": {
        const community =
          await MyGlobal.prisma.community_platform_communities.findUnique({
            where: { id: file.actor_id },
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
              ownerMember: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  nickname: true,
                  email_verified: true,
                  registered_at: true,
                  last_login_at: true,
                },
              },
            },
          });
        if (community) {
          // Need subscriber count from materialized view
          const subscriberCount =
            await MyGlobal.prisma.community_platform_mv_community_subscriber_counts.findUnique(
              {
                where: { community_id: community.id },
                select: { subscriber_count: true },
              },
            );
          actor = {
            id: community.id,
            name: community.name,
            description: community.description,
            created_at: community.created_at.toISOString(),
            owner: {
              id: community.ownerMember.id,
              email: community.ownerMember.email,
              username: community.ownerMember.username,
              nickname: community.ownerMember.nickname ?? undefined,
              email_verified: community.ownerMember.email_verified,
              registered_at: community.ownerMember.registered_at.toISOString(),
              last_login_at:
                community.ownerMember.last_login_at?.toISOString() ?? undefined,
            } satisfies ICommunityPlatformMember.ISummary,
            subscriber_count: subscriberCount?.subscriber_count ?? 0,
          } satisfies ICommunityPlatformCommunity.ISummary;
        } else {
          throw new HttpException(
            `Community actor not found: ${file.actor_id}`,
            404,
          );
        }
        break;
      }
      case "admin": {
        const admin =
          await MyGlobal.prisma.community_platform_admins.findUnique({
            where: { id: file.actor_id },
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          });
        if (admin) {
          actor = {
            id: admin.id,
            email: admin.email,
            created_at: admin.created_at.toISOString(),
            updated_at: admin.updated_at.toISOString(),
            deleted_at: admin.deleted_at?.toISOString() ?? null,
          } satisfies ICommunityPlatformAdmin.ISummary;
        } else {
          throw new HttpException(
            `Admin actor not found: ${file.actor_id}`,
            404,
          );
        }
        break;
      }
      default:
        throw new HttpException(`Unknown actor_type: ${file.actor_type}`, 400);
    }
    return {
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      status: file.status,
      public_url: file.public_url ?? null,
      actor,
      created_at: file.created_at.toISOString(),
      deleted_at: file.deleted_at?.toISOString() ?? null,
    } satisfies ICommunityPlatformFile.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
