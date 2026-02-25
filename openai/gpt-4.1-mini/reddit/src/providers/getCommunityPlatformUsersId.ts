import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformUserTransformer } from "../transformers/CommunityPlatformUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUsersId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUser> {
  const record =
    await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
      where: { id: props.id },
      ...CommunityPlatformUserTransformer.select(),
    });
  return CommunityPlatformUserTransformer.transform(record);
}
