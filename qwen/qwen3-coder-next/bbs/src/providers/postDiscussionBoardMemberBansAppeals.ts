import { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBansAppealCollector } from "../collectors/DiscussionBoardBansAppealCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberBansAppeals(props: {
  member: MemberPayload;
  body: IDiscussionBoardBansAppeal.ICreate;
}): Promise<IDiscussionBoardBansAppeal> {
  // Query the ban record to verify user's ban status
  const banRecord =
    await MyGlobal.prisma.discussion_board_bans_ban_records.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
    });
  // Create the appeal record using collector
  const created = await DiscussionBoardBansAppealCollector.collect({
    body: props.body,
    banRecord: { id: banRecord.id },
  });
  return created;
}
