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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardUserBanTransformer } from "../transformers/DiscussionBoardUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminUserBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserBan> {
  // Authorization already validated by AdminAuth decorator
  // admin payload contains authenticated admin's id and session_id
  // Retrieve ban record by ID, including soft-deleted records for audit trail
  const ban =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: {
        id: props.banId,
        // No deleted_at filter to include soft-deleted records for audit purposes
        // as specified: "maintains audit trail integrity by preserving all ban records"
      },
      ...DiscussionBoardUserBanTransformer.select(),
    });
  // Transform database record to API response DTO
  return await DiscussionBoardUserBanTransformer.transform(ban);
}
