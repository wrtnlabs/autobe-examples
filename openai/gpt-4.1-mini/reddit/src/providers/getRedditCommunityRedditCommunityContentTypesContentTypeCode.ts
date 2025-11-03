import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";

export async function getRedditCommunityRedditCommunityContentTypesContentTypeCode(props: {
  contentTypeCode: string;
}): Promise<IRedditCommunityContentType> {
  const { contentTypeCode } = props;

  const contentType =
    await MyGlobal.prisma.reddit_community_content_types.findUniqueOrThrow({
      where: { content_type_code: contentTypeCode },
      select: {
        id: true,
        content_type_code: true,
        content_type_name: true,
        description: true,
      },
    });

  return {
    id: contentType.id,
    content_type_code: contentType.content_type_code,
    content_type_name: contentType.content_type_name,
    description: contentType.description ?? null,
  };
}
