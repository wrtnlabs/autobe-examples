import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { CommunityPlatformOwnerTransformer } from "../transformers/CommunityPlatformOwnerTransformer";

export async function getCommunityPlatformOwnerOwnersOwnerId(props: {
  owner: OwnerPayload;
  ownerId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformOwner> {
  const owner = await MyGlobal.prisma.community_platform_owners.findUnique({
    where: {
      id: props.ownerId,
      deleted_at: null,
    },
    ...CommunityPlatformOwnerTransformer.select(),
  });
  if (!owner) {
    throw new HttpException("Owner not found", 404);
  }
  return await CommunityPlatformOwnerTransformer.transform(owner);
}
