import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import { ICommunityPlatformFileProcessStep } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcessStep";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFileProcessStepTransformer } from "../transformers/CommunityPlatformFileProcessStepTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformFilesFileIdProcessesProcessIdStepsStepId(props: {
  fileId: string;
  processId: string;
  stepId: string;
}): Promise<ICommunityPlatformFileProcessStep> {
  // Query step with its fileProcess relation to validate hierarchy
  const step =
    await MyGlobal.prisma.community_platform_file_process_steps.findUnique({
      where: { id: props.stepId },
      ...CommunityPlatformFileProcessStepTransformer.select(),
    });
  if (!step) {
    throw new HttpException(`Step with ID ${props.stepId} not found`, 404);
  }
  // Validate step belongs to specified process
  if (step.fileProcess.id !== props.processId) {
    throw new HttpException(
      `Step ${props.stepId} does not belong to process ${props.processId}`,
      404,
    );
  }
  // Validate process belongs to specified file
  if (step.fileProcess.file.id !== props.fileId) {
    throw new HttpException(
      `Process ${props.processId} does not belong to file ${props.fileId}`,
      404,
    );
  }
  // Transform and return
  return await CommunityPlatformFileProcessStepTransformer.transform(step);
}
