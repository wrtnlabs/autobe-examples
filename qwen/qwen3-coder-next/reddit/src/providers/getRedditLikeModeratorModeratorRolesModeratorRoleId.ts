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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeModeratorRoleTransformer } from "../transformers/RedditLikeModeratorRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeModeratorModeratorRolesModeratorRoleId(props: {
  moderator: ModeratorPayload;
  moderatorRoleId: string;
}): Promise<IRedditLikeModeratorRole> {
  const role =
    await MyGlobal.prisma.reddit_like_moderator_roles.findUniqueOrThrow({
      where: { id: props.moderatorRoleId },
      ...RedditLikeModeratorRoleTransformer.select(),
    });
  // Authorization: owner of community, moderator of community, or self
  const isOwner = role.role === "owner";
  const isModeratorOfCommunity = false; // TODO: check if moderator has access to this community
  const isSelf = role.user.id === props.moderator.id;
  if (!isOwner && !isModeratorOfCommunity && !isSelf) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditLikeModeratorRoleTransformer.transform(role);
}
