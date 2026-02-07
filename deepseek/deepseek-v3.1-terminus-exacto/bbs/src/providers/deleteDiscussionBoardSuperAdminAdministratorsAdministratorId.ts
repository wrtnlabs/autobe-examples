import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorPromotionApprovalTransformer } from "../transformers/DiscussionBoardAdministratorPromotionApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminAdministratorsAdministratorId(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorPromotionApproval> {
  // Verify the administrator assignment exists and is active
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: {
        id: props.administratorId,
        deleted_at: null,
      },
      ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
    });
  if (!administrator) {
    throw new HttpException("Administrator assignment not found", 404);
  }
  // Perform soft deletion by setting deleted_at timestamp (as specified in operation)
  const deletedAdministrator =
    await MyGlobal.prisma.discussion_board_administrators.update({
      where: { id: props.administratorId },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
    });
  // Transform and return the deleted record
  return await DiscussionBoardAdministratorPromotionApprovalTransformer.transform(
    deletedAdministrator,
  );
}
