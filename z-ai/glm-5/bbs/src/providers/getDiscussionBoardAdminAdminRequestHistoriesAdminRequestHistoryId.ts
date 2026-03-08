import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestHistory";
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
import { DiscussionBoardAdminRequestHistoryTransformer } from "../transformers/DiscussionBoardAdminRequestHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminAdminRequestHistoriesAdminRequestHistoryId(props: {
  admin: AdminPayload;
  adminRequestHistoryId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminRequestHistory> {
  const history =
    await MyGlobal.prisma.discussion_board_admin_request_histories.findUniqueOrThrow(
      {
        where: {
          id: props.adminRequestHistoryId,
        },
        ...DiscussionBoardAdminRequestHistoryTransformer.select(),
      },
    );
  return await DiscussionBoardAdminRequestHistoryTransformer.transform(history);
}
