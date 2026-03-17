import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFileProcess";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFileProcessAtSummaryTransformer } from "../transformers/CommunityPlatformFileProcessAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformFilesFileIdProcesses(props: {
  fileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFileProcess.IRequest;
}): Promise<IPageICommunityPlatformFileProcess.ISummary> {
  // 1. Verify file exists
  await MyGlobal.prisma.community_platform_files.findUniqueOrThrow({
    where: { id: props.fileId },
  });
  // 2. Build WHERE clause
  const whereInput = {
    community_platform_file_id: props.fileId,
    deleted_at: null,
    ...(props.body.started_at_from !== undefined && {
      started_at: { gte: new Date(props.body.started_at_from) },
    }),
    ...(props.body.started_at_to !== undefined && {
      started_at: { lte: new Date(props.body.started_at_to) },
    }),
    ...(props.body.completed_at_from !== undefined && {
      completed_at: { gte: new Date(props.body.completed_at_from) },
    }),
    ...(props.body.completed_at_to !== undefined && {
      completed_at: { lte: new Date(props.body.completed_at_to) },
    }),
    ...(props.body.error_present !== undefined &&
      (props.body.error_present
        ? { error_message: { not: null } }
        : { error_message: null })),
  } satisfies Prisma.community_platform_file_processesWhereInput;
  // 3. Apply pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 4. Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_file_processes.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...CommunityPlatformFileProcessAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_file_processes.count({
      where: whereInput,
    }),
  ]);
  // 5. Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformFileProcessAtSummaryTransformer.transform,
  );
  // 6. Return paginated response
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
