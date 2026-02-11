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

export async function patchRedditPlatformAdminsAdminId(props: {
  adminId: string;
  body: IRedditPlatformAdmin.IUpdate;
}): Promise<IRedditPlatformAdmin> {
  const data: Prisma.reddit_platform_adminsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.display_name !== undefined) {
    data.display_name = props.body.display_name;
  }
  if (props.body.bio !== undefined) {
    data.bio = props.body.bio;
  }
  if (props.body.avatar_url !== undefined) {
    data.avatar_url = props.body.avatar_url;
  }
  const updated = await MyGlobal.prisma.reddit_platform_admins.update({
    where: { id: props.adminId },
    data,
    ...RedditPlatformAdminTransformer.select(),
  });
  return await RedditPlatformAdminTransformer.transform(updated);
}
