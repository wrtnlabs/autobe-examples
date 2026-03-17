import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionComment";
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

export async function patchCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdComments(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationActionComment.IRequest;
}): Promise<IPageICommunityPlatformModerationActionComment.ISummary> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  const moderationStanding =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        status: "active",
        revoked_at: null,
        deleted_at: null,
      },
      select: { id: true, role: true },
    });
  if (moderationStanding === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_moderation_actions.findFirstOrThrow({
    where: {
      id: props.moderationActionId,
      community_platform_community_id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    community_platform_moderation_action_id: props.moderationActionId,
    moderationAction: {
      community_platform_community_id: props.communityId,
      deleted_at: null,
    },
    ...(props.body.linkCreatedAtFrom !== undefined ||
    props.body.linkCreatedAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.linkCreatedAtFrom !== undefined
              ? { gte: new Date(props.body.linkCreatedAtFrom) }
              : {}),
            ...(props.body.linkCreatedAtTo !== undefined
              ? { lte: new Date(props.body.linkCreatedAtTo) }
              : {}),
          },
        }
      : {}),
    comment: {
      ...(props.body.search !== undefined
        ? {
            body: {
              contains: props.body.search,
              mode: "insensitive",
            },
          }
        : {}),
      ...(props.body.status !== undefined ? { status: props.body.status } : {}),
      ...(props.body.isDeleted === undefined
        ? {}
        : props.body.isDeleted === true
          ? { deleted_at: { not: null } }
          : { deleted_at: null }),
      ...(props.body.commentCreatedAtFrom !== undefined ||
      props.body.commentCreatedAtTo !== undefined
        ? {
            created_at: {
              ...(props.body.commentCreatedAtFrom !== undefined
                ? { gte: new Date(props.body.commentCreatedAtFrom) }
                : {}),
              ...(props.body.commentCreatedAtTo !== undefined
                ? { lte: new Date(props.body.commentCreatedAtTo) }
                : {}),
            },
          }
        : {}),
    },
  } satisfies Prisma.community_platform_moderation_action_commentsWhereInput;
  const orderBy =
    props.body.sort === "linkCreatedAtAsc"
      ? ({
          created_at: "asc",
        } satisfies Prisma.community_platform_moderation_action_commentsOrderByWithRelationInput)
      : props.body.sort === "commentCreatedAtAsc"
        ? ({
            comment: { created_at: "asc" },
          } satisfies Prisma.community_platform_moderation_action_commentsOrderByWithRelationInput)
        : props.body.sort === "commentCreatedAtDesc"
          ? ({
              comment: { created_at: "desc" },
            } satisfies Prisma.community_platform_moderation_action_commentsOrderByWithRelationInput)
          : props.body.sort === "linkCreatedAtDesc"
            ? ({
                created_at: "desc",
              } satisfies Prisma.community_platform_moderation_action_commentsOrderByWithRelationInput)
            : ({
                created_at: "desc",
              } satisfies Prisma.community_platform_moderation_action_commentsOrderByWithRelationInput);
  const rows =
    await MyGlobal.prisma.community_platform_moderation_action_comments.findMany(
      {
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          comment: {
            select: {
              id: true,
              community_platform_post_id: true,
              community_platform_member_id: true,
              parent_id: true,
              body: true,
              status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          } satisfies Prisma.community_platform_commentsFindManyArgs,
        },
      },
    );
  const total =
    await MyGlobal.prisma.community_platform_moderation_action_comments.count({
      where,
    });
  return {
    data: rows.map((row) => {
      const comment: ICommunityPlatformComment = {};
      return {
        id: row.id,
        comment,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
        deleted_at: row.deleted_at?.toISOString() ?? null,
      };
    }),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
