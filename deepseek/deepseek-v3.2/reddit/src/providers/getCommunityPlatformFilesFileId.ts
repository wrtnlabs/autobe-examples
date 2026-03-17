import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFileTransformer } from "../transformers/CommunityPlatformFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformFilesFileId(props: {
  fileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformFile> {
  const file = await MyGlobal.prisma.community_platform_files.findUniqueOrThrow(
    {
      where: {
        id: props.fileId,
        deleted_at: null,
      },
      ...CommunityPlatformFileTransformer.select(),
    },
  );
  return await CommunityPlatformFileTransformer.transform(file);
}
