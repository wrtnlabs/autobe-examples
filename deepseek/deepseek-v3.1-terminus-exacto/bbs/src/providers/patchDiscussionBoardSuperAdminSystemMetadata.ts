import { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMetadatum";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemMetadatumAtSummaryTransformer } from "../transformers/DiscussionBoardSystemMetadatumAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSystemMetadata(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemMetadatum.IRequest;
}): Promise<IPageIDiscussionBoardSystemMetadatum.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.discussion_board_system_metadataWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.scope && { scope: props.body.scope }),
    ...(props.body.data_type && { data_type: props.body.data_type }),
    ...(props.body.status_type_id && {
      status_type_id: props.body.status_type_id,
    }),
  };
  // Get paginated data
  const data = await MyGlobal.prisma.discussion_board_system_metadata.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardSystemMetadatumAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_system_metadata.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSystemMetadatumAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
