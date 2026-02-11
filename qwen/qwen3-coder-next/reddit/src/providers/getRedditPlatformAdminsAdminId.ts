import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformAdminTransformer } from "../transformers/RedditPlatformAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminsAdminId(props: {
  adminId: string;
}): Promise<IRedditPlatformAdmin> {
  const admin = await MyGlobal.prisma.reddit_platform_admins.findUnique({
    where: { id: props.adminId },
    ...RedditPlatformAdminTransformer.select(),
  });
  if (!admin) throw new HttpException("Admin not found", 404);
  return await RedditPlatformAdminTransformer.transform(admin);
}
