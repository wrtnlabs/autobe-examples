import { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFeatureFlag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorFeatureFlags(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardFeatureFlag.IRequest;
}): Promise<IPageIDiscussionBoardFeatureFlag.ISummary> {
  const { body } = props;
  // Validate and normalize pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  if (page < 1) {
    throw new HttpException("Page must be greater than or equal to 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Validate date range filters
  if (body.createdAtFrom !== undefined && body.createdAtTo !== undefined) {
    if (body.createdAtFrom > body.createdAtTo) {
      throw new HttpException(
        "createdAtFrom cannot be later than createdAtTo",
        400,
      );
    }
  }
  if (body.updatedAtFrom !== undefined && body.updatedAtTo !== undefined) {
    if (body.updatedAtFrom > body.updatedAtTo) {
      throw new HttpException(
        "updatedAtFrom cannot be later than updatedAtTo",
        400,
      );
    }
  }
  // Construct Prisma where filter using string date comparisons
  const where: Prisma.discussion_board_feature_flagsWhereInput = {};
  if (body.code !== undefined) {
    where.code = body.code;
  }
  if (body.enabled !== undefined) {
    where.enabled = body.enabled;
  }
  if (body.createdAtFrom !== undefined || body.createdAtTo !== undefined) {
    where.created_at = {};
    if (body.createdAtFrom !== undefined) {
      where.created_at.gte = body.createdAtFrom;
    }
    if (body.createdAtTo !== undefined) {
      where.created_at.lte = body.createdAtTo;
    }
  }
  if (body.updatedAtFrom !== undefined || body.updatedAtTo !== undefined) {
    where.updated_at = {};
    if (body.updatedAtFrom !== undefined) {
      where.updated_at.gte = body.updatedAtFrom;
    }
    if (body.updatedAtTo !== undefined) {
      where.updated_at.lte = body.updatedAtTo;
    }
  }
  // Sorting order
  const orderBy: Prisma.discussion_board_feature_flagsOrderByWithRelationInput =
    {};
  if (body.sort === "updated_at") {
    orderBy.updated_at = "desc";
  } else {
    orderBy.created_at = "desc";
  }
  // Batch update if specified
  if (body.batchUpdate !== undefined) {
    await MyGlobal.prisma.$transaction(
      body.batchUpdate.map((update) =>
        MyGlobal.prisma.discussion_board_feature_flags.updateMany({
          where: { code: (update as any).code },
          data: { enabled: (update as any).enabled },
        }),
      ),
    );
  }
  // Calculate pagination skip
  const skip = (page - 1) * limit;
  // Query data and total count
  const data = await MyGlobal.prisma.discussion_board_feature_flags.findMany({
    where,
    skip,
    take: limit,
    orderBy,
  });
  const total = await MyGlobal.prisma.discussion_board_feature_flags.count({
    where,
  });
  // Map result to DTO, converting Date to ISO string manually using toISOStringSafe
  const resultData: IDiscussionBoardFeatureFlag.ISummary[] = data.map(
    (flag) => ({
      id: flag.id,
      code: flag.code,
      name: flag.name,
      description: flag.description,
      enabled: flag.enabled,
      createdAt: toISOStringSafe(flag.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(flag.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt:
        flag.deleted_at === null
          ? undefined
          : (toISOStringSafe(flag.deleted_at) as string &
              tags.Format<"date-time">) || null,
    }),
  );
  const pagination = {
    current: page,
    limit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
  return {
    data: resultData,
    pagination,
  };
}
