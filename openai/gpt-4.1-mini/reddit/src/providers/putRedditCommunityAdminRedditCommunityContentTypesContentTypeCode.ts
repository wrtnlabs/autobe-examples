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

export async function putRedditCommunityAdminRedditCommunityContentTypesContentTypeCode(props: {
  admin: AdminPayload;
  contentTypeCode: string;
  body: IRedditCommunityContentType.IUpdate;
}): Promise<IRedditCommunityContentType> {
  const updated = await MyGlobal.prisma.reddit_community_content_types.update({
    where: { content_type_code: props.contentTypeCode },
    data: {
      content_type_name: props.body.content_type_name,
      description: props.body.description ?? null,
    } satisfies Prisma.reddit_community_content_typesUpdateInput,
  });

  return {
    id: updated.id,
    content_type_code: updated.content_type_code,
    content_type_name: updated.content_type_name,
    description: updated.description ?? null,
  };
}
