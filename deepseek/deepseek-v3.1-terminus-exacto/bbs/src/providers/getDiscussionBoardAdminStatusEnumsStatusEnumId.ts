import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardStatusEnumTransformer } from "../transformers/DiscussionBoardStatusEnumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getDiscussionBoardAdminStatusEnumsStatusEnumId(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardStatusEnum> {
  const statusEnum =
    await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
      where: {
        id: props.statusEnumId,
        is_active: true,
        deleted_at: null,
      },
      ...DiscussionBoardStatusEnumTransformer.select(),
    });
  return await DiscussionBoardStatusEnumTransformer.transform(statusEnum);
}
