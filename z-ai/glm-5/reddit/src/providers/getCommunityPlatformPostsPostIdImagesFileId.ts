import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformFileVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileVersion";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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

export async function getCommunityPlatformPostsPostIdImagesFileId(props: {
  postId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformFile> {
  // Query junction table to validate file-post association
  // Both post and file must exist and not be soft-deleted
  const postImage =
    await MyGlobal.prisma.community_platform_post_images.findFirstOrThrow({
      where: {
        community_platform_post_id: props.postId,
        community_platform_file_id: props.fileId,
        post: { deleted_at: null },
        file: { deleted_at: null },
      },
      select: {
        file: CommunityPlatformFileTransformer.select(),
      },
    });
  return await CommunityPlatformFileTransformer.transform(postImage.file);
}
