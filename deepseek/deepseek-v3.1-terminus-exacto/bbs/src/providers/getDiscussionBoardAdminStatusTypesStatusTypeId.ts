import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardStatusTypeTransformer } from "../transformers/DiscussionBoardStatusTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminStatusTypesStatusTypeId(props: {
  admin: AdminPayload;
  statusTypeId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardStatusType> {
  const statusType =
    await MyGlobal.prisma.discussion_board_status_types.findUniqueOrThrow({
      where: {
        id: props.statusTypeId,
        deleted_at: null, // Only return active (non-deleted) status types
      },
      ...DiscussionBoardStatusTypeTransformer.select(),
    });
  return await DiscussionBoardStatusTypeTransformer.transform(statusType);
}
