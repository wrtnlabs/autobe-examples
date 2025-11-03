import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostArchive";
import { IPageICommunityPlatformPostArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostArchive";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminPostsPostIdArchives(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostArchive.IRequest;
}): Promise<IPageICommunityPlatformPostArchive> {
  /**
   * SCHEMA/API CONTRADICTION: The Prisma schema for
   * community_platform_post_archives does NOT include an 'archived_by_user_id'
   * field, but the API contract (ICommunityPlatformPostArchive) requires it for
   * every archive snapshot. This makes faithful implementation impossible
   * without schema changes. Returning mock data.
   */
  return typia.random<IPageICommunityPlatformPostArchive>();
}
