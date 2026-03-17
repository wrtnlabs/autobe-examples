import { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityBanAtSummaryTransformer } from "../transformers/CommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityBan.IRequest;
}): Promise<IPageICommunityBan.ISummary> {
  // 1. Authorization: verify member holds moderator or owner role in this community
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
    },
    select: { id: true },
  });
  if (moderatorRecord === null) {
    throw new HttpException(
      "Forbidden: not a moderator or owner of this community",
      403,
    );
  }
  // 2. Community existence check
  await MyGlobal.prisma.community_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 3. Build WHERE clause
  const whereInput = {
    community_id: props.communityId,
    ...(props.body.status != null && { status: props.body.status }),
    ...(props.body.bannedMemberId != null && {
      banned_member_id: props.body.bannedMemberId,
    }),
    ...(props.body.bannedMemberUsername != null && {
      bannedMember: {
        username: {
          contains: props.body.bannedMemberUsername,
          mode: "insensitive" as const,
        },
      },
    }),
    ...(props.body.issuingModeratorId != null && {
      issuing_moderator_id: props.body.issuingModeratorId,
    }),
    ...((props.body.createdAtFrom != null ||
      props.body.createdAtTo != null) && {
      created_at: {
        ...(props.body.createdAtFrom != null && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo != null && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    }),
  } satisfies Prisma.community_bansWhereInput;
  // 4. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 5. Query: findMany + count (sequential)
  const data = await MyGlobal.prisma.community_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_bans.count({
    where: whereInput,
  });
  // 6. Transform
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityBanAtSummaryTransformer.transform,
  );
  // 7. Return paginated result
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
