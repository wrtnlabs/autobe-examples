import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorBanRecordsBanRecordId(props: {
  administrator: AdministratorPayload;
  banRecordId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBanRecord> {
  const record =
    await MyGlobal.prisma.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banRecordId },
      ...DiscussionBoardBanRecordTransformer.select(),
    });
  return await DiscussionBoardBanRecordTransformer.transform(record);
}
