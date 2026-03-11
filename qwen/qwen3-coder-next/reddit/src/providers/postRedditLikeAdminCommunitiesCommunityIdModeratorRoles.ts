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
import { RedditLikeModeratorRoleCollector } from "../collectors/RedditLikeModeratorRoleCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeModeratorRoleTransformer } from "../transformers/RedditLikeModeratorRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAdminCommunitiesCommunityIdModeratorRoles(props: {
  admin: AdminPayload;
  communityId: string;
  body: IRedditLikeModeratorRole.ICreate;
}): Promise<IRedditLikeModeratorRole> {
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  const ownerRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirstOrThrow({
      where: {
        community_id: props.communityId,
        role: "owner",
      },
      select: { user_id: true },
    });
  if (ownerRole.user_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existingRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findUnique({
      where: {
        user_id_community_id: {
          user_id: props.body.user_id,
          community_id: props.communityId,
        },
      },
    });
  if (existingRole) {
    throw new HttpException(
      "User is already a moderator in this community",
      400,
    );
  }
  const created = await MyGlobal.prisma.reddit_like_moderator_roles.create({
    data: await RedditLikeModeratorRoleCollector.collect({
      body: props.body,
      redditLikeMembers: {
        id: props.body.user_id,
      } as IEntity,
    }),
    ...RedditLikeModeratorRoleTransformer.select(),
  });
  return await RedditLikeModeratorRoleTransformer.transform(created);
}
