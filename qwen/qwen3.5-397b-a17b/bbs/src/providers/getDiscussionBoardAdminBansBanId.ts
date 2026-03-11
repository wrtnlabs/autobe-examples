import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanTransformer } from "../transformers/DiscussionBoardBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBan> {
  const ban = await MyGlobal.prisma.discussion_board_bans.findUniqueOrThrow({
    where: {
      id: props.banId,
      deleted_at: null,
    },
    ...DiscussionBoardBanTransformer.select(),
  });
  return await DiscussionBoardBanTransformer.transform(ban);
}
