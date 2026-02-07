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

export async function postCommunityAdminPlatformMetadata(props: {
  admin: AdminPayload;
  body: ICommunityPlatformMetadatum.ICreate;
}): Promise<ICommunityPlatformMetadatum> {
  const created = await MyGlobal.prisma.community_platform_metadata.create({
    data: {
      id: v4(),
      version: props.body.version,
      environment: props.body.environment,
      status: "pending",
      checksum: props.body.checksum,
      changelog_url: props.body.changelog_url,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    version: created.version,
    environment: created.environment,
    status: created.status,
    checksum: created.checksum,
    changelog_url: created.changelog_url,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
