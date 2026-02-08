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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorSystemSettings(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSystemSetting.IRequest;
}): Promise<IPageIDiscussionBoardSystemSetting.ISummary> {
  // Extract pagination parameters from request body with defaults to page 1 and limit 100
  const page =
    typeof (props.body as any).page === "number" && (props.body as any).page > 0
      ? (props.body as any).page
      : 1;
  const limit =
    typeof (props.body as any).limit === "number" &&
    (props.body as any).limit > 0
      ? (props.body as any).limit
      : 100;
  const cursor =
    typeof (props.body as any).cursor === "string"
      ? (props.body as any).cursor
      : undefined;
  // Construct where filters based on possible keys in props.body
  // The IRequest schema is empty but description mentions filters key, value, description, so we tolerate their possible presence
  const where = {
    AND: [
      { deleted_at: null },
      ...(typeof (props.body as any).key === "string"
        ? [{ key: { contains: (props.body as any).key } }]
        : []),
      ...(typeof (props.body as any).value === "string"
        ? [{ value: { contains: (props.body as any).value } }]
        : []),
      ...(typeof (props.body as any).description === "string"
        ? [{ description: { contains: (props.body as any).description } }]
        : []),
    ],
  };
  // Use cursor-based pagination if cursor is provided
  const data = await MyGlobal.prisma.discussion_board_system_settings.findMany({
    where,
    take: limit + 1, // Take one extra to determine next cursor
    cursor: cursor ? { key: cursor } : undefined,
    skip: cursor ? 1 : 0, // Skip cursor itself if using cursor
    orderBy: { key: "asc" },
  });
  // Determine next cursor for pagination
  const hasNextPage = data.length > limit;
  if (hasNextPage) data.pop(); // Remove the extra record
  // Count total records matching where
  const total = await MyGlobal.prisma.discussion_board_system_settings.count({
    where,
  });
  // Compute total pages
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  // Prepare pagination info
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: pages,
  } satisfies IPage.IPagination;
  // Map DB records to summary DTO
  const mappedData: IDiscussionBoardSystemSetting.ISummary[] = data.map(
    (record) => ({
      key: record.key,
      value: record.value,
      description: record.description === null ? null : record.description,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    }),
  );
  return {
    data: mappedData,
    pagination,
  };
}
