import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModerationActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationAction> {
  const { actionId } = props;

  const action =
    await MyGlobal.prisma.discussion_board_moderation_actions.findUniqueOrThrow(
      {
        where: {
          id: actionId,
        },
        include: {
          moderator: true,
          relatedReport: {
            include: {
              reporter: true,
              reviewingModerator: true,
            },
          },
        },
      },
    );

  return {
    id: action.id as string & tags.Format<"uuid">,
    discussion_board_moderator_id:
      action.discussion_board_moderator_id as string & tags.Format<"uuid">,
    related_report_id:
      action.related_report_id === null
        ? undefined
        : (action.related_report_id as string & tags.Format<"uuid">),
    action_type: action.action_type,
    target_type: action.target_type,
    target_id: action.target_id as string & tags.Format<"uuid">,
    reason: action.reason,
    details: action.details === null ? undefined : action.details,
    created_at: toISOStringSafe(action.created_at),
    updated_at: toISOStringSafe(action.updated_at),
    moderator: {
      id: action.moderator.id as string & tags.Format<"uuid">,
      username: action.moderator.username,
      display_name: action.moderator.display_name,
      profile_picture_url:
        action.moderator.profile_picture_url === null
          ? null
          : (action.moderator.profile_picture_url as string &
              tags.Format<"uri">),
      email_verified: action.moderator.email_verified,
      status: action.moderator.status,
      moderation_permissions: action.moderator.moderation_permissions,
      profile_visibility: action.moderator.profile_visibility,
      activity_visibility: action.moderator.activity_visibility,
      bio: action.moderator.bio === null ? undefined : action.moderator.bio,
      location:
        action.moderator.location === null
          ? undefined
          : action.moderator.location,
      website_url:
        action.moderator.website_url === null
          ? undefined
          : (action.moderator.website_url as string & tags.Format<"uri">),
      last_login_at:
        action.moderator.last_login_at === null
          ? undefined
          : toISOStringSafe(action.moderator.last_login_at),
      created_at: toISOStringSafe(action.moderator.created_at),
      updated_at: toISOStringSafe(action.moderator.updated_at),
      deleted_at:
        action.moderator.deleted_at === null
          ? undefined
          : toISOStringSafe(action.moderator.deleted_at),
    },
    relatedReport:
      action.relatedReport === null
        ? undefined
        : {
            id: action.relatedReport.id as string & tags.Format<"uuid">,
            reporter: {
              id: action.relatedReport.reporter.id as string &
                tags.Format<"uuid">,
              username: action.relatedReport.reporter.username,
              display_name:
                action.relatedReport.reporter.display_name === null
                  ? undefined
                  : action.relatedReport.reporter.display_name,
              profile_picture_url:
                action.relatedReport.reporter.profile_picture_url === null
                  ? undefined
                  : (action.relatedReport.reporter
                      .profile_picture_url as string & tags.Format<"uri">),
            },
            reported_article_id:
              action.relatedReport.reported_article_id === null
                ? null
                : (action.relatedReport.reported_article_id as string &
                    tags.Format<"uuid">),
            reported_comment_id:
              action.relatedReport.reported_comment_id === null
                ? null
                : (action.relatedReport.reported_comment_id as string &
                    tags.Format<"uuid">),
            reported_content_type: (action.relatedReport.reported_article_id !==
            null
              ? "article"
              : "comment") as "article" | "comment",
            report_reason: action.relatedReport.report_reason,
            report_details: action.relatedReport.report_details,
            status: action.relatedReport.status as
              | "pending"
              | "under_review"
              | "resolved"
              | "dismissed",
            resolution_notes: action.relatedReport.resolution_notes,
            reviewing_moderator:
              action.relatedReport.reviewingModerator === null
                ? null
                : {
                    id: action.relatedReport.reviewingModerator.id as string &
                      tags.Format<"uuid">,
                    username: action.relatedReport.reviewingModerator.username,
                    display_name:
                      action.relatedReport.reviewingModerator.display_name,
                    profile_picture_url:
                      action.relatedReport.reviewingModerator
                        .profile_picture_url === null
                        ? null
                        : (action.relatedReport.reviewingModerator
                            .profile_picture_url as string &
                            tags.Format<"uri">),
                    email_verified:
                      action.relatedReport.reviewingModerator.email_verified,
                    status: action.relatedReport.reviewingModerator.status,
                    moderation_permissions:
                      action.relatedReport.reviewingModerator
                        .moderation_permissions,
                    profile_visibility:
                      action.relatedReport.reviewingModerator
                        .profile_visibility,
                    activity_visibility:
                      action.relatedReport.reviewingModerator
                        .activity_visibility,
                    bio:
                      action.relatedReport.reviewingModerator.bio === null
                        ? undefined
                        : action.relatedReport.reviewingModerator.bio,
                    location:
                      action.relatedReport.reviewingModerator.location === null
                        ? undefined
                        : action.relatedReport.reviewingModerator.location,
                    website_url:
                      action.relatedReport.reviewingModerator.website_url ===
                      null
                        ? undefined
                        : (action.relatedReport.reviewingModerator
                            .website_url as string & tags.Format<"uri">),
                    last_login_at:
                      action.relatedReport.reviewingModerator.last_login_at ===
                      null
                        ? undefined
                        : toISOStringSafe(
                            action.relatedReport.reviewingModerator
                              .last_login_at,
                          ),
                    created_at: toISOStringSafe(
                      action.relatedReport.reviewingModerator.created_at,
                    ),
                    updated_at: toISOStringSafe(
                      action.relatedReport.reviewingModerator.updated_at,
                    ),
                    deleted_at:
                      action.relatedReport.reviewingModerator.deleted_at ===
                      null
                        ? undefined
                        : toISOStringSafe(
                            action.relatedReport.reviewingModerator.deleted_at,
                          ),
                  },
            created_at: toISOStringSafe(action.relatedReport.created_at),
            updated_at: toISOStringSafe(action.relatedReport.updated_at),
            deleted_at:
              action.relatedReport.deleted_at === null
                ? null
                : toISOStringSafe(action.relatedReport.deleted_at),
          },
  };
}
