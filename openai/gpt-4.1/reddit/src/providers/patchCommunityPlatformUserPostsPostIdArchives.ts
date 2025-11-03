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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserPostsPostIdArchives(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostArchive.IRequest;
}): Promise<IPageICommunityPlatformPostArchive> {
  // SCHEMA-INTERFACE CONTRADICTION:
  // The Prisma model 'community_platform_post_archives' does not have the necessary 'archived_by_user_id' field required by the API return type, nor any field representing the archiving actor.
  // As such, we cannot construct the correct output for ICommunityPlatformPostArchive.
  // This is an irreconcilable contradiction. Returning mock data until schema/API updated.
  return typia.random<IPageICommunityPlatformPostArchive>();
}
