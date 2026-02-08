import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";
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

export async function patchDiscussionBoardSuperAdministratorSystemSettings(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardSystemSetting.IRequest;
}): Promise<IPageIDiscussionBoardSystemSetting.ISummary> {
  const pageNumber: number =
    typeof (props.body as any).page === "number" && (props.body as any).page > 0
      ? (props.body as any).page
      : 1;
  const limitNumber: number =
    typeof (props.body as any).limit === "number" &&
    (props.body as any).limit > 0
      ? (props.body as any).limit
      : 100;
  const cursorString: string | undefined =
    typeof (props.body as any).cursor === "string" &&
    (props.body as any).cursor.length > 0
      ? (props.body as any).cursor
      : undefined;
  const andConditions: Prisma.discussion_board_system_settingsWhereInput[] = [];
  if (
    typeof (props.body as any).key === "string" &&
    (props.body as any).key.trim() !== ""
  ) {
    andConditions.push({ key: { contains: (props.body as any).key.trim() } });
  }
  if (
    typeof (props.body as any).value === "string" &&
    (props.body as any).value.trim() !== ""
  ) {
    andConditions.push({
      value: { contains: (props.body as any).value.trim() },
    });
  }
  if (
    typeof (props.body as any).description === "string" &&
    (props.body as any).description.trim() !== ""
  ) {
    andConditions.push({
      description: { contains: (props.body as any).description.trim() },
    });
  }
  const where: Prisma.discussion_board_system_settingsWhereInput = {
    deleted_at: null,
  };
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }
  const findManyArgs: Prisma.discussion_board_system_settingsFindManyArgs = {
    where,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: limitNumber,
  };
  if (cursorString) {
    findManyArgs.cursor = { id: cursorString };
    findManyArgs.skip = 1;
  }
  const records =
    await MyGlobal.prisma.discussion_board_system_settings.findMany(
      findManyArgs,
    );
  const total = await MyGlobal.prisma.discussion_board_system_settings.count({
    where,
  });
  return {
    pagination: {
      current: pageNumber,
      limit: limitNumber,
      records: total,
      pages: Math.ceil(total / limitNumber),
    },
    data: records.map((record) => ({
      key: record.key,
      value: record.value,
      description: record.description === null ? null : record.description,
      created_at: toISOStringSafe(record.created_at),
      updated_at:
        record.updated_at === null ? null : toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
  };
}
