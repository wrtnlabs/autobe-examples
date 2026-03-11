import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeModeratorRoleTransformer } from "../transformers/RedditLikeModeratorRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeAdminModeratorRolesModeratorRoleId(props: {
  admin: AdminPayload;
  moderatorRoleId: string;
}): Promise<IRedditLikeModeratorRole> {
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findUniqueOrThrow({
      where: { id: props.moderatorRoleId },
      ...RedditLikeModeratorRoleTransformer.select(),
    });
  return await RedditLikeModeratorRoleTransformer.transform(moderatorRole);
}
