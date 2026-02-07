import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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

export async function deleteDiscussionBoardSuperAdminBansBanId(props: {
  superAdmin: SuperadminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserBan> {
  // First find the ban record to ensure it exists
  const banRecord = await MyGlobal.prisma.discussion_board_user_bans.findUnique(
    {
      where: { id: props.banId },
      ...DiscussionBoardUserBanTransformer.select(),
    },
  );
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  // Delete the ban record
  const deleted = await MyGlobal.prisma.discussion_board_user_bans.delete({
    where: { id: props.banId },
    ...DiscussionBoardUserBanTransformer.select(),
  });
  // Transform and return the deleted record
  return await DiscussionBoardUserBanTransformer.transform(deleted);
}
