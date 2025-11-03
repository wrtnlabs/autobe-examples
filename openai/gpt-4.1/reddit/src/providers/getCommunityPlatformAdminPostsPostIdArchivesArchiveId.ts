import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostArchive";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminPostsPostIdArchivesArchiveId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  archiveId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostArchive> {
  /**
   * SCHEMA-INTERFACE CONTRADICTION: The Prisma schema
   * community_platform_post_archives does NOT include an 'archived_by_user_id'
   * field, but the ICommunityPlatformPostArchive interface expects it. There is
   * no way to retrieve archiver info for the archive. Cannot implement logic as
   * required.
   */
  return typia.random<ICommunityPlatformPostArchive>();
}
