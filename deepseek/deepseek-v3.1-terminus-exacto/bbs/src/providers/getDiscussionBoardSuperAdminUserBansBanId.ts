import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardUserBanTransformer } from "../transformers/DiscussionBoardUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminUserBansBanId(props: {
  superAdmin: SuperadminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserBan> {
  const ban =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...DiscussionBoardUserBanTransformer.select(),
    });
  return await DiscussionBoardUserBanTransformer.transform(ban);
}
