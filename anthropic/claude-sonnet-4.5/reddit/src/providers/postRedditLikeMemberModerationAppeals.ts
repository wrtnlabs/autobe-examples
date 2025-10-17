import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditLikeMemberModerationAppeals(props: {
  member: MemberPayload;
  body: IRedditLikeModerationAppeal.ICreate;
}): Promise<IRedditLikeModerationAppeal> {
  const { member, body } = props;

  // Validate appeal_type and corresponding ID field
  if (body.appeal_type === "content_removal") {
    if (!body.moderation_action_id) {
      throw new HttpException(
        "moderation_action_id is required for content_removal appeals",
        400,
      );
    }
    if (body.community_ban_id || body.platform_suspension_id) {
      throw new HttpException(
        "Only moderation_action_id should be provided for content_removal appeals",
        400,
      );
    }
  } else if (body.appeal_type === "community_ban") {
    if (!body.community_ban_id) {
      throw new HttpException(
        "community_ban_id is required for community_ban appeals",
        400,
      );
    }
    if (body.moderation_action_id || body.platform_suspension_id) {
      throw new HttpException(
        "Only community_ban_id should be provided for community_ban appeals",
        400,
      );
    }
  } else if (body.appeal_type === "platform_suspension") {
    if (!body.platform_suspension_id) {
      throw new HttpException(
        "platform_suspension_id is required for platform_suspension appeals",
        400,
      );
    }
    if (body.moderation_action_id || body.community_ban_id) {
      throw new HttpException(
        "Only platform_suspension_id should be provided for platform_suspension appeals",
        400,
      );
    }
  } else {
    throw new HttpException(
      "Invalid appeal_type. Must be one of: content_removal, community_ban, platform_suspension",
      400,
    );
  }

  // Verify user is the affected party and check for duplicate appeals
  if (body.appeal_type === "content_removal" && body.moderation_action_id) {
    const moderationAction =
      await MyGlobal.prisma.reddit_like_moderation_actions.findUniqueOrThrow({
        where: { id: body.moderation_action_id },
      });

    // Verify user is the content author by checking the affected content
    let isAuthor = false;

    if (moderationAction.affected_post_id) {
      const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
        where: { id: moderationAction.affected_post_id },
      });
      isAuthor = post.reddit_like_member_id === member.id;
    } else if (moderationAction.affected_comment_id) {
      const comment =
        await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
          where: { id: moderationAction.affected_comment_id },
        });
      isAuthor = comment.reddit_like_member_id === member.id;
    }

    if (!isAuthor) {
      throw new HttpException(
        "You can only appeal moderation actions on your own content",
        403,
      );
    }

    // Check for existing appeal
    const existingAppeal =
      await MyGlobal.prisma.reddit_like_moderation_appeals.findFirst({
        where: {
          moderation_action_id: body.moderation_action_id,
        },
      });

    if (existingAppeal) {
      throw new HttpException(
        "An appeal has already been submitted for this moderation action",
        400,
      );
    }
  } else if (body.appeal_type === "community_ban" && body.community_ban_id) {
    const communityBan =
      await MyGlobal.prisma.reddit_like_community_bans.findUniqueOrThrow({
        where: { id: body.community_ban_id },
      });

    if (communityBan.banned_member_id !== member.id) {
      throw new HttpException(
        "You can only appeal bans issued against your own account",
        403,
      );
    }

    // Check for existing appeal
    const existingAppeal =
      await MyGlobal.prisma.reddit_like_moderation_appeals.findFirst({
        where: {
          community_ban_id: body.community_ban_id,
        },
      });

    if (existingAppeal) {
      throw new HttpException(
        "An appeal has already been submitted for this community ban",
        400,
      );
    }
  } else if (
    body.appeal_type === "platform_suspension" &&
    body.platform_suspension_id
  ) {
    const platformSuspension =
      await MyGlobal.prisma.reddit_like_platform_suspensions.findUniqueOrThrow({
        where: { id: body.platform_suspension_id },
      });

    if (platformSuspension.suspended_member_id !== member.id) {
      throw new HttpException(
        "You can only appeal suspensions issued against your own account",
        403,
      );
    }

    // Check for existing appeal
    const existingAppeal =
      await MyGlobal.prisma.reddit_like_moderation_appeals.findFirst({
        where: {
          platform_suspension_id: body.platform_suspension_id,
        },
      });

    if (existingAppeal) {
      throw new HttpException(
        "An appeal has already been submitted for this platform suspension",
        400,
      );
    }
  }

  // Calculate expected_resolution_at based on appeal_type
  const now = toISOStringSafe(new Date());
  const nowTimestamp = new Date().getTime();
  let hoursToAdd = 60; // Default 2.5 days for content_removal and community_ban

  if (body.appeal_type === "platform_suspension") {
    hoursToAdd = 144; // 6 days
  }

  const expectedResolutionTimestamp =
    nowTimestamp + hoursToAdd * 60 * 60 * 1000;
  const expectedResolutionAt = toISOStringSafe(
    new Date(expectedResolutionTimestamp),
  );

  // Create the appeal
  const created = await MyGlobal.prisma.reddit_like_moderation_appeals.create({
    data: {
      id: v4(),
      appellant_member_id: member.id,
      moderation_action_id: body.moderation_action_id ?? null,
      community_ban_id: body.community_ban_id ?? null,
      platform_suspension_id: body.platform_suspension_id ?? null,
      appeal_type: body.appeal_type,
      appeal_text: body.appeal_text,
      status: "pending",
      is_escalated: false,
      expected_resolution_at: expectedResolutionAt,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    appellant_member_id: created.appellant_member_id,
    appeal_type: created.appeal_type,
    appeal_text: created.appeal_text,
    status: created.status,
    decision_explanation: created.decision_explanation ?? undefined,
    is_escalated: created.is_escalated,
    expected_resolution_at: toISOStringSafe(created.expected_resolution_at),
    created_at: toISOStringSafe(created.created_at),
    reviewed_at: created.reviewed_at
      ? toISOStringSafe(created.reviewed_at)
      : undefined,
  };
}
