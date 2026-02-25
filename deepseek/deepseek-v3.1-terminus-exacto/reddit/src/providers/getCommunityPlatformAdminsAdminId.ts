import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformAdminTransformer } from "../transformers/CommunityPlatformAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminsAdminId(props: {
  adminId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAdmin> {
  const admin =
    await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
      where: {
        id: props.adminId,
        deleted_at: null,
      },
      ...CommunityPlatformAdminTransformer.select(),
    });
  return await CommunityPlatformAdminTransformer.transform(admin);
}
