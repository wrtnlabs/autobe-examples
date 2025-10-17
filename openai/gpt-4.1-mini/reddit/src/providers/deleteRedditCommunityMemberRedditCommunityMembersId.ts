import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditCommunityMemberRedditCommunityMembersId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  if (props.member.id !== props.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own member account",
      403,
    );
  }

  // Check member existence
  const existingMember =
    await MyGlobal.prisma.reddit_community_members.findUnique({
      where: { id: props.id },
    });

  if (!existingMember) {
    throw new HttpException("Member not found", 404);
  }

  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Delete related posts
    await prisma.reddit_community_posts.deleteMany({
      where: { author_member_id: props.id },
    });
    // Delete related comments
    await prisma.reddit_community_comments.deleteMany({
      where: { author_member_id: props.id },
    });
    // Delete related post votes
    await prisma.reddit_community_post_votes.deleteMany({
      where: { member_id: props.id },
    });
    // Delete related comment votes
    await prisma.reddit_community_comment_votes.deleteMany({
      where: { member_id: props.id },
    });
    // Delete karma
    await prisma.reddit_community_user_karma.deleteMany({
      where: { reddit_community_member_id: props.id },
    });
    // Delete community subscriptions
    await prisma.reddit_community_community_subscriptions.deleteMany({
      where: { reddit_community_member_id: props.id },
    });
    // Delete report actions where moderator_member_id or admin_member_id or member involved
    await prisma.reddit_community_report_actions.deleteMany({
      where: { moderator_member_id: props.id },
    });
    // Delete reports where reporter_member_id or reported_member_id
    await prisma.reddit_community_reports.deleteMany({
      where: { reporter_member_id: props.id },
    });
    await prisma.reddit_community_reports.deleteMany({
      where: { reported_member_id: props.id },
    });
    // Delete user profile
    await prisma.reddit_community_user_profiles.deleteMany({
      where: { reddit_community_member_id: props.id },
    });
    // Delete community moderators where member_id
    await prisma.reddit_community_community_moderators.deleteMany({
      where: { member_id: props.id },
    });

    // Finally delete the member
    await prisma.reddit_community_members.delete({ where: { id: props.id } });
  });
}
