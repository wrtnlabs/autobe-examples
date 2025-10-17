import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function deleteRedditCommunityCommunityModeratorRedditCommunityMembersId(props: {
  communityModerator: CommunitymoderatorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { id } = props;

  const member = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { id },
  });

  if (!member) throw new HttpException("Member not found", 404);

  await MyGlobal.prisma.reddit_community_post_votes.deleteMany({
    where: { member_id: id },
  });

  await MyGlobal.prisma.reddit_community_comment_votes.deleteMany({
    where: { member_id: id },
  });

  await MyGlobal.prisma.reddit_community_reports.deleteMany({
    where: { reporter_member_id: id },
  });

  await MyGlobal.prisma.reddit_community_report_actions.deleteMany({
    where: { moderator_member_id: id },
  });

  await MyGlobal.prisma.reddit_community_community_subscriptions.deleteMany({
    where: { reddit_community_member_id: id },
  });

  await MyGlobal.prisma.reddit_community_community_moderators.deleteMany({
    where: { member_id: id },
  });

  await MyGlobal.prisma.reddit_community_user_karma.deleteMany({
    where: { reddit_community_member_id: id },
  });

  await MyGlobal.prisma.reddit_community_user_profiles.deleteMany({
    where: { reddit_community_member_id: id },
  });

  await MyGlobal.prisma.reddit_community_comments.deleteMany({
    where: { author_member_id: id },
  });

  await MyGlobal.prisma.reddit_community_posts.deleteMany({
    where: { author_member_id: id },
  });

  await MyGlobal.prisma.reddit_community_members.delete({
    where: { id },
  });
}
