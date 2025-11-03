import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function deleteCommunityBbsCommunityMemberPostsPostId(props: {
  communityMember: CommunitymemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { communityMember, postId } = props;

  // Prepare timestamp once
  const now = toISOStringSafe(new Date());

  // Fetch the post record (verify existence and ownership context)
  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      community_bbs_community_id: true,
      community_bbs_communitymember_id: true,
      is_published: true,
    },
  });

  if (!post) {
    throw new HttpException("Not Found", 404);
  }

  // Block deletion if there are active escalations for reports referencing this post
  const activeEscalation =
    await MyGlobal.prisma.community_bbs_report_escalations.findFirst({
      where: {
        resolved_at: null,
        report: {
          target_type: "post",
          target_id: postId,
        },
      },
    });

  if (activeEscalation) {
    throw new HttpException("Conflict: active escalation or legal hold", 409);
  }

  // Authorization: allow if author
  const isAuthor = post.community_bbs_communitymember_id === communityMember.id;

  // Authorization: allow if active moderator of the community
  const moderator =
    await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
      where: {
        community_id: post.community_bbs_community_id,
        community_member_id: communityMember.id,
        active: true,
      },
    });

  const isModerator = moderator !== null;

  if (!isAuthor && !isModerator) {
    throw new HttpException(
      "Unauthorized: only author or moderator can delete",
      403,
    );
  }

  // Perform soft-delete: set deleted_at and unpublish. Reuse 'now'.
  await MyGlobal.prisma.community_bbs_posts.update({
    where: { id: postId },
    data: {
      deleted_at: now,
      is_published: false,
      updated_at: now,
    },
  });

  // If moderator initiated, create moderation_action and audit_log
  if (isModerator && moderator) {
    await MyGlobal.prisma.community_bbs_moderation_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderator_id: moderator.id,
        target_post_id: postId,
        action_type: "remove",
        reason_code: "removed_by_moderator",
        note: `Removed by moderator (moderator_id=${moderator.id})`,
        expires_at: null,
        created_at: now,
        updated_at: now,
      },
    });

    await MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        target_post_id: postId,
        actor_type: "community_moderator",
        actor_id: moderator.community_member_id,
        entity: "post",
        action: "deleted",
        payload: JSON.stringify({
          reason: "removed_by_moderator",
          moderator_id: moderator.id,
        }),
        ip: null,
        created_at: now,
        updated_at: now,
      },
    });
  }

  return;
}
