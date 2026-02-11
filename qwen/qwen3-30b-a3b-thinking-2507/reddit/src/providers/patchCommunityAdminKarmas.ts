import { ICommunityKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarma";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarma";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityKarmaAtSummaryTransformer } from "../transformers/CommunityKarmaAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminKarmas(props: {
  admin: AdminPayload;
  body: ICommunityKarma.IRequest;
}): Promise<IPageICommunityKarma.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.community_karmasWhereInput = {
    deleted_at: null,
    ...(props.body.user_id && { user_id: props.body.user_id }),
    ...(props.body.min_karma && {
      score: { gte: props.body.min_karma },
      ...(props.body.max_karma && { score: { lte: props.body.max_karma } }),
    }),
  };
  const data = await MyGlobal.prisma.community_karmas.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      user: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          created_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.community_karmas.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityKarmaAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
