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

export async function putDiscussionBoardAdminAdminRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminRequest.IUpdate;
}): Promise<IDiscussionBoardAdminRequest> {
  // Verify super administrator grade
  const admin = await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow(
    {
      where: { id: props.admin.id },
      select: { grade: true },
    },
  );
  if (admin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch the admin request to verify existence and soft-delete status
  const request =
    await MyGlobal.prisma.discussion_board_admin_requests.findUnique({
      where: { id: props.requestId },
      select: { status: true, deleted_at: true },
    });
  // Verify request exists and is not soft-deleted
  if (request === null || request.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Verify pending status (terminal state protection)
  if (request.status !== "pending") {
    throw new HttpException("Conflict", 409);
  }
  // Update the request with status, reviewer, and timestamps
  await MyGlobal.prisma.discussion_board_admin_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.status,
      discussion_board_admin_id: props.admin.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Fetch updated request with all relations for transformation
  const updated =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  return await DiscussionBoardAdminRequestTransformer.transform(updated);
}
