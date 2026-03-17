import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityMemberAtSummaryTransformer } from "../transformers/CommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMembers(props: {
  body: ICommunityMember.IRequest;
}): Promise<IPageICommunityMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search != null && {
      username: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.displayName != null && {
      profile: {
        display_name: {
          contains: props.body.displayName,
          mode: "insensitive" as const,
        },
      },
    }),
  } satisfies Prisma.community_membersWhereInput;
  const orderByInput = (
    props.body.sort === "karma_score"
      ? { profile: { karma_score: "desc" as const } }
      : { created_at: "desc" as const }
  ) satisfies Prisma.community_membersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.community_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_members.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      CommunityMemberAtSummaryTransformer.transform,
    ),
  };
}
