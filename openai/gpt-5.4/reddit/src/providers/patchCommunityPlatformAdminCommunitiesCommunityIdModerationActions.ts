import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdModerationActions(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationAction.IRequest;
}): Promise<IPageICommunityPlatformModerationAction.ISummary> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        community_platform_member_id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            code: true,
            email: true,
            email_verified: true,
            status: true,
            last_signed_in_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.community_platform_membersFindManyArgs,
        subscriptions: {
          where: {
            active: true,
            deleted_at: null,
          },
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_subscriptionsFindManyArgs,
      },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const authority =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.admin.id,
        status: "active",
        deleted_at: null,
        revoked_at: null,
      },
      select: {
        id: true,
      },
    });
  if (
    community.community_platform_member_id !== props.admin.id &&
    authority === null
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortValue = props.body.sort ?? "created_at_desc";
  const direction =
    sortValue.includes("asc") === true || sortValue.includes("oldest") === true
      ? "asc"
      : "desc";
  const whereInput = {
    community_platform_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.community_platform_community_moderator_id !== undefined && {
      community_platform_community_moderator_id:
        props.body.community_platform_community_moderator_id,
    }),
    ...(props.body.note !== undefined && {
      note: {
        contains: props.body.note,
        mode: "insensitive",
      },
    }),
    ...((props.body.created_from !== undefined ||
      props.body.created_to !== undefined) && {
      created_at: {
        ...(props.body.created_from !== undefined && {
          gte: props.body.created_from,
        }),
        ...(props.body.created_to !== undefined && {
          lte: props.body.created_to,
        }),
      },
    }),
    ...(props.body.target_type === "post" && {
      postTarget: {
        isNot: null,
      },
    }),
    ...(props.body.target_type === "comment" && {
      commentTarget: {
        isNot: null,
      },
    }),
    ...(props.body.target_type === "report" && {
      reportTarget: {
        isNot: null,
      },
    }),
    ...(props.body.target_type === "ban" && {
      banTarget: {
        isNot: null,
      },
    }),
  } satisfies Prisma.community_platform_moderation_actionsWhereInput;
  const data =
    await MyGlobal.prisma.community_platform_moderation_actions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [{ created_at: direction }, { id: direction }],
      select: {
        id: true,
        action_type: true,
        note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        communityModerator: {
          select: {
            id: true,
            role: true,
            status: true,
            granted_at: true,
            revoked_at: true,
            revocation_reason: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            community: {
              select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                member: {
                  select: {
                    id: true,
                    code: true,
                    email: true,
                    email_verified: true,
                    status: true,
                    last_signed_in_at: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                } satisfies Prisma.community_platform_membersFindManyArgs,
                subscriptions: {
                  where: {
                    active: true,
                    deleted_at: null,
                  },
                  select: {
                    id: true,
                  },
                } satisfies Prisma.community_platform_subscriptionsFindManyArgs,
              },
            } satisfies Prisma.community_platform_communitiesFindManyArgs,
            member: {
              select: {
                id: true,
                code: true,
                email: true,
                email_verified: true,
                status: true,
                last_signed_in_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.community_platform_membersFindManyArgs,
            grantedByMember: {
              select: {
                id: true,
                code: true,
                email: true,
                email_verified: true,
                status: true,
                last_signed_in_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.community_platform_membersFindManyArgs,
            revokedByMember: {
              select: {
                id: true,
                code: true,
                email: true,
                email_verified: true,
                status: true,
                last_signed_in_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.community_platform_membersFindManyArgs,
          },
        } satisfies Prisma.community_platform_community_moderatorsFindManyArgs,
        community: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            member: {
              select: {
                id: true,
                code: true,
                email: true,
                email_verified: true,
                status: true,
                last_signed_in_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.community_platform_membersFindManyArgs,
            subscriptions: {
              where: {
                active: true,
                deleted_at: null,
              },
              select: {
                id: true,
              },
            } satisfies Prisma.community_platform_subscriptionsFindManyArgs,
          },
        } satisfies Prisma.community_platform_communitiesFindManyArgs,
        postTarget: {
          select: {
            community_platform_post_id: true,
          },
        } satisfies Prisma.community_platform_moderation_action_postsFindManyArgs,
        commentTarget: {
          select: {
            community_platform_comment_id: true,
          },
        } satisfies Prisma.community_platform_moderation_action_commentsFindManyArgs,
        reportTarget: {
          select: {
            community_platform_report_id: true,
          },
        } satisfies Prisma.community_platform_moderation_action_reportsFindManyArgs,
        banTarget: {
          select: {
            community_platform_community_ban_id: true,
          },
        } satisfies Prisma.community_platform_moderation_action_bansFindManyArgs,
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_moderation_actions.count({
      where: whereInput,
    });
  return {
    data: data.map((record) => {
      const targetType =
        record.postTarget !== null
          ? "post"
          : record.commentTarget !== null
            ? "comment"
            : record.reportTarget !== null
              ? "report"
              : record.banTarget !== null
                ? "ban"
                : "unknown";
      const targetId =
        record.postTarget !== null
          ? record.postTarget.community_platform_post_id
          : record.commentTarget !== null
            ? record.commentTarget.community_platform_comment_id
            : record.reportTarget !== null
              ? record.reportTarget.community_platform_report_id
              : record.banTarget !== null
                ? record.banTarget.community_platform_community_ban_id
                : null;
      return {
        id: record.id,
        communityModerator: {
          id: record.communityModerator.id,
          community: {
            id: record.communityModerator.community.id,
            slug: record.communityModerator.community.slug,
            title: record.communityModerator.community.title,
            description: record.communityModerator.community.description,
            status: record.communityModerator.community.status,
            member: {
              id: record.communityModerator.community.member.id,
              code: record.communityModerator.community.member.code,
              email: record.communityModerator.community.member.email,
              email_verified:
                record.communityModerator.community.member.email_verified,
              status: record.communityModerator.community.member.status,
              last_signed_in_at:
                record.communityModerator.community.member.last_signed_in_at ===
                null
                  ? null
                  : toISOStringSafe(
                      record.communityModerator.community.member
                        .last_signed_in_at,
                    ),
              created_at: toISOStringSafe(
                record.communityModerator.community.member.created_at,
              ),
              updated_at: toISOStringSafe(
                record.communityModerator.community.member.updated_at,
              ),
              deleted_at:
                record.communityModerator.community.member.deleted_at === null
                  ? null
                  : toISOStringSafe(
                      record.communityModerator.community.member.deleted_at,
                    ),
            } satisfies ICommunityPlatformMember.ISummary,
            subscriber_count:
              record.communityModerator.community.subscriptions.length,
            created_at: toISOStringSafe(
              record.communityModerator.community.created_at,
            ),
            updated_at: toISOStringSafe(
              record.communityModerator.community.updated_at,
            ),
            deleted_at:
              record.communityModerator.community.deleted_at === null
                ? null
                : toISOStringSafe(
                    record.communityModerator.community.deleted_at,
                  ),
          } satisfies ICommunityPlatformCommunity.ISummary,
          member: {
            id: record.communityModerator.member.id,
            code: record.communityModerator.member.code,
            email: record.communityModerator.member.email,
            email_verified: record.communityModerator.member.email_verified,
            status: record.communityModerator.member.status,
            last_signed_in_at:
              record.communityModerator.member.last_signed_in_at === null
                ? null
                : toISOStringSafe(
                    record.communityModerator.member.last_signed_in_at,
                  ),
            created_at: toISOStringSafe(
              record.communityModerator.member.created_at,
            ),
            updated_at: toISOStringSafe(
              record.communityModerator.member.updated_at,
            ),
            deleted_at:
              record.communityModerator.member.deleted_at === null
                ? null
                : toISOStringSafe(record.communityModerator.member.deleted_at),
          } satisfies ICommunityPlatformMember.ISummary,
          grantedByMember: {
            id: record.communityModerator.grantedByMember.id,
            code: record.communityModerator.grantedByMember.code,
            email: record.communityModerator.grantedByMember.email,
            email_verified:
              record.communityModerator.grantedByMember.email_verified,
            status: record.communityModerator.grantedByMember.status,
            last_signed_in_at:
              record.communityModerator.grantedByMember.last_signed_in_at ===
              null
                ? null
                : toISOStringSafe(
                    record.communityModerator.grantedByMember.last_signed_in_at,
                  ),
            created_at: toISOStringSafe(
              record.communityModerator.grantedByMember.created_at,
            ),
            updated_at: toISOStringSafe(
              record.communityModerator.grantedByMember.updated_at,
            ),
            deleted_at:
              record.communityModerator.grantedByMember.deleted_at === null
                ? null
                : toISOStringSafe(
                    record.communityModerator.grantedByMember.deleted_at,
                  ),
          } satisfies ICommunityPlatformMember.ISummary,
          revokedByMember:
            record.communityModerator.revokedByMember === null
              ? null
              : ({
                  id: record.communityModerator.revokedByMember.id,
                  code: record.communityModerator.revokedByMember.code,
                  email: record.communityModerator.revokedByMember.email,
                  email_verified:
                    record.communityModerator.revokedByMember.email_verified,
                  status: record.communityModerator.revokedByMember.status,
                  last_signed_in_at:
                    record.communityModerator.revokedByMember
                      .last_signed_in_at === null
                      ? null
                      : toISOStringSafe(
                          record.communityModerator.revokedByMember
                            .last_signed_in_at,
                        ),
                  created_at: toISOStringSafe(
                    record.communityModerator.revokedByMember.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    record.communityModerator.revokedByMember.updated_at,
                  ),
                  deleted_at:
                    record.communityModerator.revokedByMember.deleted_at ===
                    null
                      ? null
                      : toISOStringSafe(
                          record.communityModerator.revokedByMember.deleted_at,
                        ),
                } satisfies ICommunityPlatformMember.ISummary),
          role: record.communityModerator.role,
          status: record.communityModerator.status,
          granted_at: toISOStringSafe(record.communityModerator.granted_at),
          revoked_at:
            record.communityModerator.revoked_at === null
              ? null
              : toISOStringSafe(record.communityModerator.revoked_at),
          revocation_reason:
            record.communityModerator.revocation_reason ?? null,
          created_at: toISOStringSafe(record.communityModerator.created_at),
          updated_at: toISOStringSafe(record.communityModerator.updated_at),
          deleted_at:
            record.communityModerator.deleted_at === null
              ? null
              : toISOStringSafe(record.communityModerator.deleted_at),
        } satisfies ICommunityPlatformCommunityModerator.ISummary,
        community: {
          id: record.community.id,
          slug: record.community.slug,
          title: record.community.title,
          description: record.community.description,
          status: record.community.status,
          member: {
            id: record.community.member.id,
            code: record.community.member.code,
            email: record.community.member.email,
            email_verified: record.community.member.email_verified,
            status: record.community.member.status,
            last_signed_in_at:
              record.community.member.last_signed_in_at === null
                ? null
                : toISOStringSafe(record.community.member.last_signed_in_at),
            created_at: toISOStringSafe(record.community.member.created_at),
            updated_at: toISOStringSafe(record.community.member.updated_at),
            deleted_at:
              record.community.member.deleted_at === null
                ? null
                : toISOStringSafe(record.community.member.deleted_at),
          } satisfies ICommunityPlatformMember.ISummary,
          subscriber_count: record.community.subscriptions.length,
          created_at: toISOStringSafe(record.community.created_at),
          updated_at: toISOStringSafe(record.community.updated_at),
          deleted_at:
            record.community.deleted_at === null
              ? null
              : toISOStringSafe(record.community.deleted_at),
        } satisfies ICommunityPlatformCommunity.ISummary,
        action_type: record.action_type,
        targetType,
        targetId,
        note: record.note ?? null,
        created_at: toISOStringSafe(record.created_at),
        updated_at: toISOStringSafe(record.updated_at),
        deleted_at:
          record.deleted_at === null
            ? null
            : toISOStringSafe(record.deleted_at),
      } satisfies ICommunityPlatformModerationAction.ISummary;
    }),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
