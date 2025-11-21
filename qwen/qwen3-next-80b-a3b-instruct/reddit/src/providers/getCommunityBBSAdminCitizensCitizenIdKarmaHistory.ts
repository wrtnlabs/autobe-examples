import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageICommunityBBSKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSKarmaHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBBSKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSKarmaHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityBBSAdminCitizensCitizenIdKarmaHistory(props: {
  admin: AdminPayload;
  citizenId: string;
}): Promise<IPageICommunityBBSKarmaHistory> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_karma_history.findMany({
      where: {
        community_bbs_citizen_id: props.citizenId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_bbs_karma_history.count({
      where: {
        community_bbs_citizen_id: props.citizenId,
        deleted_at: null,
      },
    }),
  ]);

  return {
    data: records.map(
      (record) => record.id as unknown as ICommunityBBSKarmaHistory,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
