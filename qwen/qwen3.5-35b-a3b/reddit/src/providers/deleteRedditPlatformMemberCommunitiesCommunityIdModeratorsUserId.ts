import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformMemberCommunitiesCommunityIdModeratorsUserId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        owner_id: props.member.id,
      },
    });
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirstOrThrow(
      {
        where: {
          community_id: props.communityId,
          user_id: props.userId,
        },
        select: { id: true },
      },
    );
  if (props.userId === community.owner_id) {
    throw new HttpException("Cannot remove the community owner", 403);
  }
  await MyGlobal.prisma.reddit_platform_community_moderators.delete({
    where: { id: moderatorAssignment.id },
  });
  await MyGlobal.prisma.reddit_platform_moderator_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_id: props.communityId,
      user_id: props.userId,
      acted_by_id: props.member.id,
      action_type: "REMOVED",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
