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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminAnalyticsKarmas(props: {
  admin: AdminPayload;
}): Promise<IPageICommunityKarma.ISummary> {
  const page = 1;
  const limit = 100;
  const data = await MyGlobal.prisma.community_karmas.findMany({
    select: {
      id: true,
      score: true,
      created_at: true,
      updated_at: true,
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
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { score: "desc" },
    where: { deleted_at: null },
  });
  const total = await MyGlobal.prisma.community_karmas.count({
    where: { deleted_at: null },
  });
  return {
    data: data.map((karma) => ({
      id: karma.id,
      score: karma.score,
      created_at: toISOStringSafe(karma.created_at),
      updated_at: toISOStringSafe(karma.updated_at),
      user: {
        id: karma.user.id,
        display_name: karma.user.display_name ?? undefined,
        avatar_url: karma.user.avatar_url ?? undefined,
        created_at: toISOStringSafe(karma.user.created_at),
        deleted_at: karma.user.deleted_at
          ? toISOStringSafe(karma.user.deleted_at)
          : null,
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
