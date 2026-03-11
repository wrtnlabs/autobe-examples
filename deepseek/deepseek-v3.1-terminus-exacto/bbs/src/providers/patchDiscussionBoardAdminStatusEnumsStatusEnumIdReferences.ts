import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnumReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardStatusEnumReferenceAtSummaryTransformer } from "../transformers/DiscussionBoardStatusEnumReferenceAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminStatusEnumsStatusEnumIdReferences(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnumReference.IRequest;
}): Promise<IPageIDiscussionBoardStatusEnumReference.ISummary> {
  // Ensure the status enum exists
  await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
    where: { id: props.statusEnumId },
  });
  // Build where clause
  const whereInput = {
    discussion_board_status_enums_id: props.statusEnumId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { referenced_table: { contains: props.body.search } },
        { referenced_column: { contains: props.body.search } },
      ],
    }),
    ...(props.body.created_after && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
  } satisfies Prisma.discussion_board_status_enum_referencesWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch data and total count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_status_enum_references.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardStatusEnumReferenceAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_status_enum_references.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardStatusEnumReferenceAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
