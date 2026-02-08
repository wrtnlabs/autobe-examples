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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardFeatureFlagsBulkUpdate(props: {
  body: IDiscussionBoardFeatureFlag.IUpdate;
}): Promise<IPageIDiscussionBoardFeatureFlag.ISummary> {
  // Validate input array
  if (!Array.isArray(props.body)) {
    throw new HttpException("Request body must be an array", 400);
  }
  // Cast body to array with explicit typing for safety
  const updates = props.body as Array<{
    id: string;
    enabled: boolean;
  }>;
  for (const item of updates) {
    if (typeof item.id !== "string") {
      throw new HttpException(`Invalid id type for ${item.id}`, 400);
    }
    if (
      !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
        item.id,
      )
    ) {
      throw new HttpException(`Invalid UUID format for id ${item.id}`, 400);
    }
    if (typeof item.enabled !== "boolean") {
      throw new HttpException(`Invalid enabled flag for id ${item.id}`, 400);
    }
  }
  const updatedFlags = await MyGlobal.prisma.$transaction(async (prisma) => {
    for (const updateItem of updates) {
      await prisma.discussion_board_feature_flags.update({
        where: { id: updateItem.id },
        data: { enabled: updateItem.enabled },
      });
    }
    const ids = updates.map((item) => item.id);
    const flags = await prisma.discussion_board_feature_flags.findMany({
      where: { id: { in: ids } },
      orderBy: { created_at: "desc" },
    });
    return flags;
  });
  const total = updatedFlags.length;
  return {
    data: updatedFlags.map((flag) => ({
      id: flag.id,
      code: flag.code,
      name: flag.name,
      description: flag.description || null,
      enabled: flag.enabled,
      created_at: toISOStringSafe(flag.created_at),
      updated_at: toISOStringSafe(flag.updated_at),
      deleted_at: flag.deleted_at ? toISOStringSafe(flag.deleted_at) : null,
    })),
    pagination: {
      current: 1,
      limit: total,
      records: total,
      pages: total > 0 ? 1 : 0,
    },
  };
}
