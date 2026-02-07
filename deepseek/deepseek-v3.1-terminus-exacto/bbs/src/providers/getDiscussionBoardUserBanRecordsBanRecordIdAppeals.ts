import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanAppeal";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardBanAppealAtSummaryTransformer } from "../transformers/DiscussionBoardBanAppealAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserBanRecordsBanRecordIdAppeals(props: {
  user: UserPayload;
  banRecordId: string & tags.Format<"uuid">;
  body: {
    page?: number & tags.Type<"int32"> & tags.Minimum<1>;
    limit?: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;
  };
}): Promise<IPageIDiscussionBoardBanAppeal.ISummary> {
  // Validate and set pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Verify the ban record exists and belongs to the authenticated user
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: {
        id: props.banRecordId,
        ban_status: { in: ["active", "expired", "revoked"] },
      },
    });
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  // Query ban appeals for this ban record
  const data = await MyGlobal.prisma.discussion_board_ban_appeals.findMany({
    where: {
      discussion_board_ban_record_id: props.banRecordId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { appealed_at: "desc" },
    ...DiscussionBoardBanAppealAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_ban_appeals.count({
    where: {
      discussion_board_ban_record_id: props.banRecordId,
      deleted_at: null,
    },
  });
  // Transform results using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardBanAppealAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
