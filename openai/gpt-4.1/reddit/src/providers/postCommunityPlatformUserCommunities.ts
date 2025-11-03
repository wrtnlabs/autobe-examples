import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserCommunities(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  // Case-insensitive uniqueness: compare lower-case name only
  const queryName = props.body.name.toLowerCase();
  const existing =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: queryName,
      },
    });
  if (existing) {
    throw new HttpException("Community name already exists.", 409);
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_communities.create({
    data: {
      id: v4(),
      creator_user_id: props.user.id,
      name: queryName,
      description: props.body.description,
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
    deleted_at: null,
  };
}
