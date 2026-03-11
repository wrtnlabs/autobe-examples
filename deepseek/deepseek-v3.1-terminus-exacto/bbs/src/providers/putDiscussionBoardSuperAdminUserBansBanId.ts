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

export async function putDiscussionBoardSuperAdminUserBansBanId(props: {
  superAdmin: SuperadminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserBan.IUpdate;
}): Promise<IDiscussionBoardUserBan> {
  // 1. Verify the ban record exists
  const existingBan =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
    });
  // 2. Prepare update data with partial updates
  const updateData: Prisma.discussion_board_user_bansUpdateInput = {
    ...(props.body.reason !== undefined && { reason: props.body.reason }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.expires_at !== undefined && {
      expires_at: props.body.expires_at
        ? new Date(props.body.expires_at)
        : null,
    }),
    updated_at: new Date(),
  };
  // 3. Perform the update
  await MyGlobal.prisma.discussion_board_user_bans.update({
    where: { id: props.banId },
    data: updateData,
  });
  // 4. Fetch updated record with transformer select
  const updatedBan =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...DiscussionBoardUserBanTransformer.select(),
    });
  // 5. Transform and return
  return await DiscussionBoardUserBanTransformer.transform(updatedBan);
}
