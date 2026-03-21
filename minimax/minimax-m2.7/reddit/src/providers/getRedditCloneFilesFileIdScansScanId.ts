import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneFileScanTransformer } from "../transformers/RedditCloneFileScanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneFilesFileIdScansScanId(props: {
  fileId: string & tags.Format<"uuid">;
  scanId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneFileScan> {
  const scan = await MyGlobal.prisma.reddit_clone_file_scans.findUniqueOrThrow({
    where: {
      id: props.scanId,
      reddit_clone_file_id: props.fileId,
    },
    ...RedditCloneFileScanTransformer.select(),
  });
  return await RedditCloneFileScanTransformer.transform(scan);
}
