import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminRedditCommunityContentTypesContentTypeCode(props: {
  admin: AdminPayload;
  contentTypeCode: string;
}): Promise<void> {
  // Check existence
  const existing =
    await MyGlobal.prisma.reddit_community_content_types.findUnique({
      where: { content_type_code: props.contentTypeCode },
    });

  if (!existing) {
    throw new HttpException("Content type not found", 404);
  }

  // Hard delete by content_type_code
  await MyGlobal.prisma.reddit_community_content_types.deleteMany({
    where: { content_type_code: props.contentTypeCode },
  });
}
