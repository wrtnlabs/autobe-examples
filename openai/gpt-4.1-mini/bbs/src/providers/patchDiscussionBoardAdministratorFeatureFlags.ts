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
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null as null,
  } satisfies Prisma.discussion_board_feature_flagsWhereInput;
  const data = await MyGlobal.prisma.discussion_board_feature_flags.findMany({
    where,
    skip,
    take: limit,
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
  function toUuidFormat(id: string): string & tags.Format<"uuid"> {
    return id as unknown as string & tags.Format<"uuid">;
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: toUuidFormat(item.id),
      code: item.code,
      name: item.name,
      description: item.description,
      enabled: item.enabled,
      created_at: item.created_at ? toISOStringSafe(item.created_at) : null,
      updated_at: item.updated_at ? toISOStringSafe(item.updated_at) : null,
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
