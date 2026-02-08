import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformBannedUserCollector } from "../collectors/CommunityPlatformBannedUserCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminBannedUsers(props: {
  admin: AdminPayload;
  body: ICommunityPlatformBannedUser.ICreate;
}): Promise<ICommunityPlatformBannedUser> {
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: (props.body as any).community_platform_user_id },
  });
  if (!user) throw new HttpException("User not found", 400);
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: (props.body as any).community_platform_community_id },
    });
  if (!community) throw new HttpException("Community not found", 400);
  const existingBan =
    await MyGlobal.prisma.community_platform_banned_users.findUnique({
      where: {
        community_platform_user_id_community_platform_community_id: {
          community_platform_user_id: (props.body as any)
            .community_platform_user_id,
          community_platform_community_id: (props.body as any)
            .community_platform_community_id,
        },
      },
    });
  if (existingBan && existingBan.deleted_at === null) {
    throw new HttpException("Ban record already exists", 400);
  }
  // Assign ban reason from request body to pass into collector
  const createData = await CommunityPlatformBannedUserCollector.collect({
    body: {
      ...(props.body as any),
      reason: (props.body as any).reason ?? "",
    },
    user: { id: (props.body as any).community_platform_user_id },
    community: { id: (props.body as any).community_platform_community_id },
  });
  // Perform create operation
  const created = await MyGlobal.prisma.community_platform_banned_users.create({
    data: createData,
  });
  return {
    id: created.id,
    community_platform_user_id: created.community_platform_user_id,
    community_platform_community_id: created.community_platform_community_id,
    banned_at: toISOStringSafe(created.banned_at) as string &
      tags.Format<"date-time">,
    unbanned_at:
      created.unbanned_at === null
        ? null
        : (toISOStringSafe(created.unbanned_at) as string &
            tags.Format<"date-time">),
    reason: created.reason,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      created.deleted_at === null
        ? null
        : (toISOStringSafe(created.deleted_at) as string &
            tags.Format<"date-time">),
  };
}
