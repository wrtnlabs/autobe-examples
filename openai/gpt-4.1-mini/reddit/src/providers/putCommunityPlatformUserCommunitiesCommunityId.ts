import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserCommunitiesCommunityId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_user_id: true },
    });
  if (community.owner_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.name !== undefined) {
    const existing =
      await MyGlobal.prisma.community_platform_communities.findUnique({
        where: { name: props.body.name },
        select: { id: true },
      });
    if (existing !== null && existing.id !== props.communityId) {
      throw new HttpException("Conflict: community name already in use", 409);
    }
  }
  const updateData: {
    name?: string;
    description?: string;
    icon_url?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: new Date().toISOString() as unknown as string &
      tags.Format<"date-time">,
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.icon_url !== undefined) {
    updateData.icon_url = props.body.icon_url;
  }
  await MyGlobal.prisma.community_platform_communities.update({
    where: { id: props.communityId },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...CommunityPlatformCommunityTransformer.select(),
    });
  return await CommunityPlatformCommunityTransformer.transform(updated);
}
