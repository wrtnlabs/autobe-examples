import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityModeratorAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.IRequest;
}): Promise<IPageICommunityPlatformCommunityModerator.ISummary> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        community_platform_member_id: true,
      },
    });
  if (community.community_platform_member_id !== props.member.id) {
    const moderatorAssignment =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id: props.communityId,
          community_platform_member_id: props.member.id,
          status: "active",
          deleted_at: null,
          revoked_at: null,
        },
        select: {
          id: true,
        },
      });
    if (moderatorAssignment === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  if (
    props.body.role !== undefined &&
    props.body.role !== "owner" &&
    props.body.role !== "moderator"
  ) {
    throw new HttpException("Unsupported role filter", 400);
  }
  if (
    props.body.status !== undefined &&
    props.body.status !== "active" &&
    props.body.status !== "revoked"
  ) {
    throw new HttpException("Unsupported status filter", 400);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "granted_at:desc";
  const [sortField, sortDirectionRaw] = sort.split(":");
  const direction: Prisma.SortOrder | null =
    sortDirectionRaw === "asc"
      ? "asc"
      : sortDirectionRaw === undefined || sortDirectionRaw === "desc"
        ? "desc"
        : null;
  if (
    sortField !== "granted_at" &&
    sortField !== "created_at" &&
    sortField !== "updated_at" &&
    sortField !== "id"
  ) {
    throw new HttpException("Unsupported sort option", 400);
  }
  if (direction === null) {
    throw new HttpException("Unsupported sort option", 400);
  }
  const whereInput = {
    community_platform_community_id: props.communityId,
    ...(props.body.role !== undefined && { role: props.body.role }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.search !== undefined &&
      props.body.search.length !== 0 && {
        OR: [
          {
            member: {
              code: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          },
          {
            member: {
              email: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          },
          {
            member: {
              profile: {
                is: {
                  display_name: {
                    contains: props.body.search,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        ],
      }),
  } satisfies Prisma.community_platform_community_moderatorsWhereInput;
  const orderByInput: Prisma.community_platform_community_moderatorsOrderByWithRelationInput[] =
    sortField === "granted_at"
      ? [{ granted_at: direction }, { id: direction }]
      : sortField === "created_at"
        ? [{ created_at: direction }, { id: direction }]
        : sortField === "updated_at"
          ? [{ updated_at: direction }, { id: direction }]
          : [{ id: direction }];
  const transformerSelect =
    CommunityPlatformCommunityModeratorAtSummaryTransformer.select();
  const selectInput =
    "select" in transformerSelect
      ? transformerSelect.select
      : transformerSelect;
  const data: Prisma.community_platform_community_moderatorsGetPayload<{
    select: typeof selectInput;
  }>[] = await MyGlobal.prisma.community_platform_community_moderators.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: selectInput,
    },
  );
  const total =
    await MyGlobal.prisma.community_platform_community_moderators.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformCommunityModeratorAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
