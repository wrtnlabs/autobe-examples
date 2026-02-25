import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanAppealTransformer } from "../transformers/DiscussionBoardBanAppealTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBansBanIdAppeals(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IUpdate;
}): Promise<IDiscussionBoardBanAppeal> {
  // Verify admin exists
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirstOrThrow({
    where: { id: props.admin.id, deleted_at: null },
  });
  // Find appeal by ban ID
  const existingAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.findFirst({
      where: {
        discussion_board_ban_record_id: props.banId,
        deleted_at: null,
      },
      select: { id: true, status: true },
    });
  if (!existingAppeal) {
    throw new HttpException("Ban appeal not found", 404);
  }
  // Validate status transition
  if (
    existingAppeal.status === "approved" ||
    existingAppeal.status === "rejected"
  ) {
    throw new HttpException("Cannot update already decided appeal", 400);
  }
  // Validate decision reason requirement
  if (
    (props.body.status === "approved" || props.body.status === "rejected") &&
    (!props.body.decision_reason ||
      props.body.decision_reason.trim().length === 0)
  ) {
    throw new HttpException(
      "Decision reason required for approval/rejection",
      400,
    );
  }
  // Prepare update data
  const updateData = {
    updated_at: new Date().toISOString(),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.decision_reason !== undefined && {
      decision_reason: props.body.decision_reason,
    }),
    ...(props.body.status &&
      props.body.status !== existingAppeal.status && {
        reviewed_at: new Date().toISOString(),
        discussion_board_admin_id: props.admin.id,
      }),
  };
  await MyGlobal.prisma.discussion_board_ban_appeals.update({
    where: { id: existingAppeal.id },
    data: updateData,
  });
  // Get full transformed response
  const appealWithRelations =
    await MyGlobal.prisma.discussion_board_ban_appeals.findUniqueOrThrow({
      where: { id: existingAppeal.id },
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  return await DiscussionBoardBanAppealTransformer.transform(
    appealWithRelations,
  );
}
