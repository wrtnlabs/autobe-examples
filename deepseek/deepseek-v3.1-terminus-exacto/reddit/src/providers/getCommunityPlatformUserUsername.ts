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
import { CommunityPlatformUserTransformer } from "../transformers/CommunityPlatformUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserUsername(props: {
  user: UserPayload;
  username: string;
}): Promise<ICommunityPlatformUser> {
  const userRecord =
    await MyGlobal.prisma.community_platform_users.findFirstOrThrow({
      where: {
        username: props.username,
        deleted_at: null,
      },
      ...CommunityPlatformUserTransformer.select(),
    });
  return await CommunityPlatformUserTransformer.transform(userRecord);
}
