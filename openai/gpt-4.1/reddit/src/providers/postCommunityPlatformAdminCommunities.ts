import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminCommunities(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  const { admin, body } = props;
  // Check for name conflict (case-insensitive, as per unique index and business rule)
  const existing =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { name: body.name.toLowerCase() },
    });
  if (existing !== null) {
    throw new HttpException("A community with this name already exists.", 409);
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_communities.create({
    data: {
      id: v4(),
      creator_user_id: admin.id,
      name: body.name.toLowerCase(),
      description: body.description,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    creator_user_id: created.creator_user_id,
    name: created.name,
    description: created.description,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
