import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminRedditCommunityUserKarma(props: {
  admin: AdminPayload;
  body: IRedditCommunityUserKarma.ICreate;
}): Promise<IRedditCommunityUserKarma> {
  const created = await MyGlobal.prisma.reddit_community_user_karma.create({
    data: {
      id: v4(),
      registered_user_id: props.admin.id,
      karma: props.body.karma,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });

  return {
    id: created.id,
    registered_user_id: created.registered_user_id,
    karma: created.karma,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
