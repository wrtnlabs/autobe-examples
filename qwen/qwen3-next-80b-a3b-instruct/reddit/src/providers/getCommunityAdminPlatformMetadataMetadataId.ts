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

export async function getCommunityAdminPlatformMetadataMetadataId(props: {
  admin: AdminPayload;
  metadataId: string;
}): Promise<ICommunityPlatformMetadatum> {
  const metadata = await MyGlobal.prisma.community_platform_metadata.findUnique(
    {
      where: { id: props.metadataId },
    },
  );
  if (!metadata) {
    throw new HttpException("Platform metadata not found", 404);
  }
  return {
    id: metadata.id,
    rollback_target_id: metadata.rollback_target_id,
    version: metadata.version,
    environment: metadata.environment,
    status: metadata.status,
    checksum: metadata.checksum,
    changelog_url: metadata.changelog_url,
    created_at: toISOStringSafe(metadata.created_at),
    updated_at: toISOStringSafe(metadata.updated_at),
    deleted_at: metadata.deleted_at
      ? toISOStringSafe(metadata.deleted_at)
      : null,
  };
}
