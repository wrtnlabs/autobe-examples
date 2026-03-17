import { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarma";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformKarmaAtSummaryTransformer } from "../transformers/CommunityPlatformKarmaAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberKarmas(props: {
  member: MemberPayload;
  body: ICommunityPlatformKarma.IRequest;
}): Promise<IPageICommunityPlatformKarma.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.member_id && { member_id: props.body.member_id }),
    ...(props.body.min_score !== undefined && {
      score: { gte: props.body.min_score },
    }),
    ...(props.body.max_score !== undefined && {
      score: { lte: props.body.max_score },
    }),
    ...(props.body.created_at_start && {
      created_at: {
        gte: new Date(props.body.created_at_start),
      },
    }),
    ...(props.body.created_at_end &&
      props.body.created_at_end !== null && {
        created_at: {
          lte: new Date(props.body.created_at_end),
        },
      }),
    ...(props.body.updated_at_start && {
      updated_at: {
        gte: new Date(props.body.updated_at_start),
      },
    }),
    ...(props.body.updated_at_end &&
      props.body.updated_at_end !== null && {
        updated_at: {
          lte: new Date(props.body.updated_at_end),
        },
      }),
    ...(props.body.search && {
      member: {
        OR: [
          { username: { contains: props.body.search, mode: "insensitive" } },
          { nickname: { contains: props.body.search, mode: "insensitive" } },
        ],
      },
    }),
  } satisfies Prisma.community_platform_karmasWhereInput;
  const orderByInput = (
    props.body.sort === "score-asc"
      ? { score: "asc" as const }
      : props.body.sort === "score-desc"
        ? { score: "desc" as const }
        : props.body.sort === "created_at-asc"
          ? { created_at: "asc" as const }
          : props.body.sort === "created_at-desc"
            ? { created_at: "desc" as const }
            : props.body.sort === "updated_at-asc"
              ? { updated_at: "asc" as const }
              : props.body.sort === "updated_at-desc"
                ? { updated_at: "desc" as const }
                : { score: "desc" as const }
  ) satisfies Prisma.community_platform_karmasOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_karmas.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformKarmaAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_karmas.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformKarmaAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
