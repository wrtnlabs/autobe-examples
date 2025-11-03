import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorInvitation";
import { IPageICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorInvitation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserCommunitiesCommunityIdModeratorInvitations(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModeratorInvitation.IRequest;
}): Promise<IPageICommunityPlatformCommunityModeratorInvitation.ISummary> {
  // Check that user is a moderator for this community
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_user_id: props.user.id,
        community_platform_community_id: props.communityId,
      },
    });
  if (!moderator) {
    throw new HttpException(
      "Forbidden: Only moderators can view invitations for this community.",
      403,
    );
  }
  const page = props.body.page ?? 0;
  const limit = props.body.limit ?? 20;
  // Build where clause for filters
  const where = {
    community_platform_community_id: props.communityId,
    ...(props.body.invitee_user_id !== undefined && {
      community_platform_user_id: props.body.invitee_user_id,
    }),
    ...(props.body.inviter_user_id !== undefined && {
      invited_by_user_id: props.body.inviter_user_id,
    }),
    ...(props.body.status === "pending" && {
      accepted_at: null,
      revoked_at: null,
    }),
    ...(props.body.status === "accepted" && {
      accepted_at: { not: null },
    }),
    ...(props.body.status === "revoked" && {
      revoked_at: { not: null },
    }),
    ...(props.body.invited_after !== undefined && {
      invited_at: { gte: props.body.invited_after },
    }),
    ...(props.body.invited_before !== undefined && {
      invited_at: {
        ...(props.body.invited_after !== undefined
          ? { gte: props.body.invited_after }
          : {}),
        lte: props.body.invited_before,
      },
    }),
    ...(props.body.accepted_after !== undefined && {
      accepted_at: {
        ...(props.body.status === "accepted" ? { not: null } : {}),
        gte: props.body.accepted_after,
      },
    }),
    ...(props.body.accepted_before !== undefined && {
      accepted_at: {
        ...(props.body.status === "accepted" ? { not: null } : {}),
        lte: props.body.accepted_before,
      },
    }),
    ...(props.body.revoked_after !== undefined && {
      revoked_at: {
        ...(props.body.status === "revoked" ? { not: null } : {}),
        gte: props.body.revoked_after,
      },
    }),
    ...(props.body.revoked_before !== undefined && {
      revoked_at: {
        ...(props.body.status === "revoked" ? { not: null } : {}),
        lte: props.body.revoked_before,
      },
    }),
  };
  // Determine sort field and direction inline in findMany orderBy
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_moderator_invitations.findMany(
      {
        where,
        orderBy:
          props.body.sort_by === "accepted_at"
            ? { accepted_at: props.body.sort_order === "asc" ? "asc" : "desc" }
            : props.body.sort_by === "revoked_at"
              ? { revoked_at: props.body.sort_order === "asc" ? "asc" : "desc" }
              : {
                  invited_at: props.body.sort_order === "asc" ? "asc" : "desc",
                },
        skip: page * limit,
        take: limit,
        include: {
          invitee: { select: { id: true, display_name: true } },
          inviter: { select: { id: true, display_name: true } },
          community: { select: { id: true, name: true, description: true } },
        },
      },
    ),
    MyGlobal.prisma.community_platform_community_moderator_invitations.count({
      where,
    }),
  ]);
  // Map to ISummary objects
  const data = rows.map((row) => ({
    id: row.id,
    user: {
      id: row.invitee.id,
      display_name: row.invitee.display_name,
    },
    community: {
      id: row.community.id,
      name: row.community.name,
      description: row.community.description,
    },
    invited_by: {
      id: row.inviter.id,
      display_name: row.inviter.display_name,
    },
    invited_at: toISOStringSafe(row.invited_at),
    accepted_at:
      row.accepted_at !== null && row.accepted_at !== undefined
        ? toISOStringSafe(row.accepted_at)
        : undefined,
    revoked_at:
      row.revoked_at !== null && row.revoked_at !== undefined
        ? toISOStringSafe(row.revoked_at)
        : undefined,
  }));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
