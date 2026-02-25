import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostLinkTransformer } from "../transformers/CommunityPlatformPostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdLink(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostLink> {
  const record = await MyGlobal.prisma.community_platform_post_links.findFirst({
    where: {
      community_platform_post_id: props.postId,
      deleted_at: null,
      post: {
        post_type: "link",
        deleted_at: null,
      },
    },
    ...CommunityPlatformPostLinkTransformer.select(),
  });
  if (record === null) {
    throw new HttpException("Not Found", 404);
  }
  return await CommunityPlatformPostLinkTransformer.transform(record);
}
