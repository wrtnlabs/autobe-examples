import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
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
import { DiscussionBoardAdminRequestTransformer } from "../transformers/DiscussionBoardAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminAdminRequestsAdminRequestId(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminRequest.IUpdate;
}): Promise<IDiscussionBoardAdminRequest> {
  // Find the existing admin request - exclude soft-deleted
  const request =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: {
        id: props.adminRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  // Validate status is pending (cannot modify approved/rejected requests)
  if (request.status !== "pending") {
    throw new HttpException("Cannot update a request that is not pending", 409);
  }
  // Update the reason field and timestamp
  const updated = await MyGlobal.prisma.discussion_board_admin_requests.update({
    where: { id: props.adminRequestId },
    data: {
      reason: props.body.reason,
      updated_at: new Date(),
    },
    ...DiscussionBoardAdminRequestTransformer.select(),
  });
  return await DiscussionBoardAdminRequestTransformer.transform(updated);
}
