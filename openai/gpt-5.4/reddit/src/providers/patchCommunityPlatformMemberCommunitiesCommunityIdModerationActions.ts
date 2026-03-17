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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformCommunityModeratorAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunitiesCommunityIdModerationActions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationAction.IRequest;
}): Promise<IPageICommunityPlatformModerationAction.ISummary> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  const authority =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        status: "active",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (authority === null) throw new HttpException("Forbidden", 403);
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
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
          gte: new Date(props.body.created_from),
        }),
        ...(props.body.created_to !== undefined && {
          lte: new Date(props.body.created_to),
        }),
      },
    }),
    ...(props.body.target_type === "post" && {
      postTarget: { isNot: null },
    }),
    ...(props.body.target_type === "comment" && {
      commentTarget: { isNot: null },
    }),
    ...(props.body.target_type === "report" && {
      reportTarget: { isNot: null },
    }),
    ...(props.body.target_type === "ban" && {
      banTarget: { isNot: null },
    }),
  } satisfies Prisma.community_platform_moderation_actionsWhereInput;
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : [{ created_at: "desc" }, { id: "desc" }]
  ) satisfies Prisma.community_platform_moderation_actionsOrderByWithRelationInput[];
  const records =
    await MyGlobal.prisma.community_platform_moderation_actions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        action_type: true,
        note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        communityModerator:
          CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        postTarget: {
          select: {
            community_platform_post_id: true,
          },
        },
        commentTarget: {
          select: {
            community_platform_comment_id: true,
          },
        },
        reportTarget: {
          select: {
            community_platform_report_id: true,
          },
        },
        banTarget: {
          select: {
            community_platform_community_ban_id: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_moderation_actions.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(records, async (record) => {
      const resolvedTarget =
        record.postTarget !== null
          ? {
              type: "post",
              id: record.postTarget.community_platform_post_id,
            }
          : record.commentTarget !== null
            ? {
                type: "comment",
                id: record.commentTarget.community_platform_comment_id,
              }
            : record.reportTarget !== null
              ? {
                  type: "report",
                  id: record.reportTarget.community_platform_report_id,
                }
              : record.banTarget !== null
                ? {
                    type: "ban",
                    id: record.banTarget.community_platform_community_ban_id,
                  }
                : null;
      return {
        id: record.id,
        communityModerator:
          await CommunityPlatformCommunityModeratorAtSummaryTransformer.transform(
            record.communityModerator,
          ),
        community:
          await CommunityPlatformCommunityAtSummaryTransformer.transform(
            record.community,
          ),
        action_type: record.action_type,
        targetType: resolvedTarget?.type ?? props.body.target_type ?? "report",
        targetId: resolvedTarget?.id ?? null,
        note: record.note ?? null,
        created_at: toISOStringSafe(record.created_at),
        updated_at: toISOStringSafe(record.updated_at),
        deleted_at:
          record.deleted_at !== null
            ? toISOStringSafe(record.deleted_at)
            : null,
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
