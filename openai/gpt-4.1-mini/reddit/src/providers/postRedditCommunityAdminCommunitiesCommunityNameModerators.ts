import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminCommunitiesCommunityNameModerators(props: {
  admin: AdminPayload;
  communityName: string;
  body: IRedditCommunityCommunityModerator.ICreate;
}): Promise<IRedditCommunityCommunityModerator> {
  const { admin, communityName, body } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
    });
  if (!community) {
    throw new HttpException(`Community '${communityName}' not found`, 404);
  }

  const existing =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        reddit_community_community_id: community.id,
        reddit_community_moderator_id: body.reddit_community_moderator_id,
      },
    });
  if (existing) {
    throw new HttpException(`Moderator assignment already exists`, 409);
  }

  const id = v4();

  const created =
    await MyGlobal.prisma.reddit_community_community_moderators.create({
      data: {
        id: id as string & tags.Format<"uuid">,
        reddit_community_community_id: community.id,
        reddit_community_moderator_id: body.reddit_community_moderator_id,
        assigned_at: body.assigned_at,
      },
    });

  return {
    id: created.id,
    reddit_community_community_id: created.reddit_community_community_id,
    reddit_community_moderator_id: created.reddit_community_moderator_id,
    assigned_at: toISOStringSafe(created.assigned_at),
  };
}
