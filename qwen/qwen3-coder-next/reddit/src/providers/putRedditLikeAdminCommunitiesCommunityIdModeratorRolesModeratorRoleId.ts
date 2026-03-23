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

export async function putRedditLikeAdminCommunitiesCommunityIdModeratorRolesModeratorRoleId(props: {
  admin: AdminPayload;
  communityId: string;
  moderatorRoleId: string;
  body: IRedditLikeModeratorRole.IUpdate;
}): Promise<IRedditLikeModeratorRole> {
  // Verify admin is the owner of the target community
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
  // Update the moderator role
  const updated = await MyGlobal.prisma.reddit_like_moderator_roles.update({
    where: { id: props.moderatorRoleId },
    data: { role: props.body.role },
    ...RedditLikeModeratorRoleTransformer.select(),
  });
  return await RedditLikeModeratorRoleTransformer.transform(updated);
}
