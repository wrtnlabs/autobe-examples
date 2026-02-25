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
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          username: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          display_name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.username && {
      username: { contains: props.body.username, mode: "insensitive" as const },
    }),
    ...(props.body.display_name && {
      display_name: {
        contains: props.body.display_name,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.karma_min !== undefined || props.body.karma_max !== undefined
      ? {
          karma: {
            ...(props.body.karma_min !== undefined && {
              gte: props.body.karma_min,
            }),
            ...(props.body.karma_max !== undefined && {
              lte: props.body.karma_max,
            }),
          },
        }
      : {}),
    ...(props.body.created_at_from !== null &&
      props.body.created_at_from !== undefined && {
        created_at: { gte: props.body.created_at_from },
      }),
    ...(props.body.created_at_to !== null &&
      props.body.created_at_to !== undefined && {
        created_at: { lte: props.body.created_at_to },
      }),
  } satisfies Prisma.community_membersWhereInput;
  const orderByInput = (() => {
    switch (props.body.sort) {
      case "created_at":
        return { created_at: "desc" as const };
      case "username":
        return { username: "asc" as const };
      default:
        return { karma: "desc" as const };
    }
  })() satisfies Prisma.community_membersOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_members.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityMemberAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_members.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityMemberAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
