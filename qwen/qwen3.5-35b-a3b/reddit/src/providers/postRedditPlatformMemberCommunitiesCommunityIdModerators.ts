import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityModeratorTransformer } from "../transformers/RedditPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityModerator.ICreate;
}): Promise<IRedditPlatformCommunityModerator> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_id: true },
    });
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const targetMember =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.body.user_id },
      select: { id: true },
    });
  const existingModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.body.user_id,
      },
    });
  if (existingModerator !== null) {
    throw new HttpException("Member is already a moderator", 409);
  }
  if (targetMember.id === community.owner_id) {
    throw new HttpException("Cannot add owner as moderator", 409);
  }
  const id: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.reddit_platform_community_moderators.create({
    data: {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      community: { connect: { id: props.communityId } },
      user: { connect: { id: props.body.user_id } },
    },
  });
  await MyGlobal.prisma.reddit_platform_moderator_histories.create({
    data: {
      id: v4(),
      community_id: props.communityId,
      user_id: props.body.user_id,
      acted_by_id: props.member.id,
      action_type: "APPOINTED",
      notes: `Appointed member ${props.body.user_id} as moderator`,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  const moderatorRecord =
    await MyGlobal.prisma.reddit_platform_community_moderators.findUniqueOrThrow(
      {
        where: { id },
        ...RedditPlatformCommunityModeratorTransformer.select(),
      },
    );
  return await RedditPlatformCommunityModeratorTransformer.transform(
    moderatorRecord,
  );
}
