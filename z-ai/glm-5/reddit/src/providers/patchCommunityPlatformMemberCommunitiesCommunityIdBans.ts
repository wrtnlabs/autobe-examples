import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformBanAtSummaryTransformer } from "../transformers/CommunityPlatformBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBan.IRequest;
}): Promise<IPageICommunityPlatformBan.ISummary> {
  // Verify moderator status
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.community_platform_bansOrderByWithRelationInput;
  // Build date range filter
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.from !== undefined) {
    createdAtFilter.gte = new Date(props.body.from);
  }
  if (props.body.to !== undefined) {
    createdAtFilter.lte = new Date(props.body.to);
  }
  // Build WHERE clause
  const whereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        member: {
          username: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      }),
    ...(props.body.reason !== undefined &&
      props.body.reason !== "" && {
        reason: { contains: props.body.reason, mode: "insensitive" as const },
      }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.community_platform_bansWhereInput;
  // Execute queries
  const bans = await MyGlobal.prisma.community_platform_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPlatformBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_bans.count({
    where: whereInput,
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      bans,
      CommunityPlatformBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
