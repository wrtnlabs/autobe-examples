import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityCollector } from "../collectors/CommunityPlatformCommunityCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserCommunities(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  // Instead of findUnique which requires 'where', use findFirst with empty filter to check if any record exists
  const existing =
    await MyGlobal.prisma.community_platform_communities.findFirst();
  if (existing !== null) {
    throw new HttpException(`Community name already exists.`, 400);
  }
  const data = await CommunityPlatformCommunityCollector.collect({
    body: props.body,
    ownerUser: { id: props.user.id },
  });
  const created = await MyGlobal.prisma.community_platform_communities.create({
    data: data,
  });
  return {
    id: created.id,
    owner_user_id: created.owner_user_id,
    name: created.name,
    description: created.description,
    icon_url: created.icon_url,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
