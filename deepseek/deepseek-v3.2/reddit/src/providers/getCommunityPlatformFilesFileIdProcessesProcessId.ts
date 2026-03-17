import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFileProcessTransformer } from "../transformers/CommunityPlatformFileProcessTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformFilesFileIdProcessesProcessId(props: {
  fileId: string;
  processId: string;
}): Promise<ICommunityPlatformFileProcess> {
  // Find the file process record ensuring it belongs to the specified file
  const process =
    await MyGlobal.prisma.community_platform_file_processes.findUniqueOrThrow({
      where: {
        id: props.processId,
        community_platform_file_id: props.fileId,
        deleted_at: null,
      },
      ...CommunityPlatformFileProcessTransformer.select(),
    });
  // Transform using the available transformer
  return await CommunityPlatformFileProcessTransformer.transform(process);
}
