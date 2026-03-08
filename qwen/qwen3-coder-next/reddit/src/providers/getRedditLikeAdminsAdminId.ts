import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeAdminTransformer } from "../transformers/RedditLikeAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeAdminsAdminId(props: {
  adminId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeAdmin> {
  const admin = await MyGlobal.prisma.reddit_like_admins.findUniqueOrThrow({
    where: { id: props.adminId },
    ...RedditLikeAdminTransformer.select(),
  });
  return await RedditLikeAdminTransformer.transform(admin);
}
