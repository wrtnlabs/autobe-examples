import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformUserTransformer } from "../transformers/CommunityPlatformUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminUsername(props: {
  admin: AdminPayload;
  username: string;
}): Promise<ICommunityPlatformUser> {
  const user = await MyGlobal.prisma.community_platform_users.findUniqueOrThrow(
    {
      where: {
        username: props.username,
        deleted_at: null,
      },
      ...CommunityPlatformUserTransformer.select(),
    },
  );
  return await CommunityPlatformUserTransformer.transform(user);
}
