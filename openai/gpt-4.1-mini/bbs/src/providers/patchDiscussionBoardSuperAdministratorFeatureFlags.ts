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
  const {
    code,
    enabled,
    createdAtFrom,
    createdAtTo,
    updatedAtFrom,
    updatedAtTo,
    page = 1,
    limit = 20,
    sort = "created_at",
    batchUpdate,
  } = props.body;
  const pageNumber = Math.max(1, page);
  const pageSize = Math.min(Math.max(1, limit), 100);
  const sortField = sort === "updated_at" ? "updated_at" : "created_at";
  if (batchUpdate && batchUpdate.length > 0) {
    await MyGlobal.prisma.$transaction(async (tx) => {
      for (const update of batchUpdate) {
        const updateTyped = update as {
          code: string;
          enabled: boolean;
        };
        if (
          typeof updateTyped.code !== "string" ||
          updateTyped.code.trim() === ""
        ) {
          throw new HttpException("Invalid code in batchUpdate", 400);
        }
        if (typeof updateTyped.enabled !== "boolean") {
          throw new HttpException("Invalid enabled flag in batchUpdate", 400);
        }
        await tx.discussion_board_feature_flags.updateMany({
          where: { code: updateTyped.code },
          data: {
            enabled: updateTyped.enabled,
            updated_at: toISOStringSafe(new Date()),
          },
        });
      }
    });
  }
  const where: Prisma.discussion_board_feature_flagsWhereInput = {
    ...(code ? { code } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
    ...(createdAtFrom ? { created_at: { gte: new Date(createdAtFrom) } } : {}),
    ...(createdAtTo ? { created_at: { lte: new Date(createdAtTo) } } : {}),
    ...(updatedAtFrom ? { updated_at: { gte: new Date(updatedAtFrom) } } : {}),
    ...(updatedAtTo ? { updated_at: { lte: new Date(updatedAtTo) } } : {}),
  };
  const skip = (pageNumber - 1) * pageSize;
  const data = await MyGlobal.prisma.discussion_board_feature_flags.findMany({
    where,
    orderBy: { [sortField]: "desc" },
    skip,
    take: pageSize,
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
    data: data.map((flag) => ({
      id: flag.id,
      code: flag.code,
      name: flag.name,
      description: flag.description,
      enabled: flag.enabled,
      createdAt: toISOStringSafe(flag.created_at),
      updatedAt: toISOStringSafe(flag.updated_at),
      deletedAt: flag.deleted_at ? toISOStringSafe(flag.deleted_at) : null,
    })),
    pagination: {
      current: pageNumber,
      limit: pageSize,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  };
}
