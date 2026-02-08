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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorFeatureFlags(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardFeatureFlag.IRequest;
}): Promise<IPageIDiscussionBoardFeatureFlag.ISummary> {
  const pageRaw = (
    props.body as {
      page?: number | undefined;
      limit?: number | undefined;
    }
  ).page;
  const limitRaw = (
    props.body as {
      page?: number | undefined;
      limit?: number | undefined;
    }
  ).limit;
  const page = pageRaw === undefined || pageRaw === null ? 1 : pageRaw;
  const limit = limitRaw === undefined || limitRaw === null ? 100 : limitRaw;
  if (!Number.isInteger(page) || page < 1) {
    throw new HttpException("Page number must be an integer >= 1", 400);
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new HttpException("Limit must be an integer >= 1", 400);
  }
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
  } satisfies Prisma.discussion_board_feature_flagsWhereInput;
  const data = await MyGlobal.prisma.discussion_board_feature_flags.findMany({
    where,
    take: limit,
    skip,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      enabled: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_feature_flags.count({
    where,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description,
      enabled: record.enabled,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
