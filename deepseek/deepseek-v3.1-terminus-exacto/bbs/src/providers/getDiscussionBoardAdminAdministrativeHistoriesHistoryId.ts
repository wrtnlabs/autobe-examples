import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
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
import { DiscussionBoardAdministrativeHistoryTransformer } from "../transformers/DiscussionBoardAdministrativeHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminAdministrativeHistoriesHistoryId(props: {
  admin: AdminPayload;
  historyId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministrativeHistory> {
  // Check if admin is super administrator
  const adminRecord =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
      select: {
        admin_grade: true,
      },
    });
  if (adminRecord.admin_grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the administrative history record
  const history =
    await MyGlobal.prisma.discussion_board_administrative_histories.findUniqueOrThrow(
      {
        where: { id: props.historyId },
        ...DiscussionBoardAdministrativeHistoryTransformer.select(),
      },
    );
  return await DiscussionBoardAdministrativeHistoryTransformer.transform(
    history,
  );
}
