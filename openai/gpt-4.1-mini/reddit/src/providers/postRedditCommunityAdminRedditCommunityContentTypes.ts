import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminRedditCommunityContentTypes(props: {
  admin: AdminPayload;
  body: IRedditCommunityContentType.ICreate;
}): Promise<IRedditCommunityContentType> {
  const { admin, body } = props;

  // Create new content type with generated UUID
  const created = await MyGlobal.prisma.reddit_community_content_types.create({
    data: {
      id: v4(),
      content_type_code: body.content_type_code,
      content_type_name: body.content_type_name,
      description: body.description ?? null,
    },
  });

  return {
    id: created.id,
    content_type_code: created.content_type_code,
    content_type_name: created.content_type_name,
    description: created.description ?? null,
  };
}
