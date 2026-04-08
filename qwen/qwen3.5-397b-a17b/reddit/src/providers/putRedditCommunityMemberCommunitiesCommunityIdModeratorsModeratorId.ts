import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityModeratorTransformer } from "../transformers/RedditCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditCommunityModerator.IUpdate;
}): Promise<IRedditCommunityModerator> {
  const moderator =
    await MyGlobal.prisma.reddit_community_moderators.findUniqueOrThrow({
      where: {
        id: props.moderatorId,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_community_member_id: true,
        reddit_community_community_id: true,
        role: true,
      },
    });
  if (moderator.reddit_community_community_id !== props.communityId) {
    throw new HttpException(
      "Moderator assignment not found in this community",
      404,
    );
  }
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  if (community.owner_id !== props.member.id) {
    throw new HttpException(
      "Only the community owner can update moderator roles",
      403,
    );
  }
  if (
    moderator.reddit_community_member_id === community.owner_id &&
    props.body.role !== undefined &&
    props.body.role !== "owner"
  ) {
    throw new HttpException("Cannot demote the community owner", 400);
  }
  await MyGlobal.prisma.reddit_community_moderators.update({
    where: {
      id: props.moderatorId,
    },
    data: {
      ...(props.body.role !== undefined && { role: props.body.role }),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_community_moderators.findUniqueOrThrow({
      where: {
        id: props.moderatorId,
      },
      ...RedditCommunityModeratorTransformer.select(),
    });
  return await RedditCommunityModeratorTransformer.transform(updated);
}
