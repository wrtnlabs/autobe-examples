import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import { ICommunityPlatformFileProcessStep } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcessStep";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformFileProcessStep } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFileProcessStep";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFileProcessStepAtSummaryTransformer } from "../transformers/CommunityPlatformFileProcessStepAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformFilesFileIdProcessesProcessIdSteps(props: {
  fileId: string;
  processId: string;
  body: ICommunityPlatformFileProcessStep.IRequest;
}): Promise<IPageICommunityPlatformFileProcessStep.ISummary> {
  // Verify file exists
  await MyGlobal.prisma.community_platform_files.findUniqueOrThrow({
    where: { id: props.fileId },
  });
  // Verify process exists and belongs to file
  await MyGlobal.prisma.community_platform_file_processes.findUniqueOrThrow({
    where: {
      id: props.processId,
      community_platform_file_id: props.fileId,
    },
  });
  // Build WHERE clause
  const where: Prisma.community_platform_file_process_stepsWhereInput = {
    community_platform_file_process_id: props.processId,
    ...(props.body.step_name && {
      step_name: { contains: props.body.step_name },
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  };
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_file_process_steps.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...CommunityPlatformFileProcessStepAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_file_process_steps.count({ where }),
  ]);
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformFileProcessStepAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
