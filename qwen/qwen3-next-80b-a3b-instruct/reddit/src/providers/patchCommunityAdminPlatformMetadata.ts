import { ICommunityPlatformMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminPlatformMetadata(props: {
  admin: AdminPayload;
}): Promise<ICommunityPlatformMetadatum> {
  const metadata = await MyGlobal.prisma.community_platform_metadata.findFirst({
    where: {
      status: "success",
    },
    orderBy: {
      created_at: "desc",
    },
    take: 1,
    select: {
      version: true,
      environment: true,
      checksum: true,
      changelog_url: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!metadata) {
    throw new HttpException("No successful deployment found", 404);
  }
  return metadata;
}
