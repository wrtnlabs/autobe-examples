import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorRequestTransformer } from "../transformers/DiscussionBoardAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminRequestsRequestIdApprove(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorRequest> {
  const request =
    await MyGlobal.prisma.discussion_board_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          submitter_member_id: true,
        },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Request is not pending", 400);
  }
  const approvedRequest =
    await MyGlobal.prisma.discussion_board_administrator_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        processed_at: new Date(),
        processed_by_super_admin_id: props.superAdmin.id,
      },
      ...DiscussionBoardAdministratorRequestTransformer.select(),
    });
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: request.submitter_member_id },
    data: {
      role: "admin",
    },
  });
  return await DiscussionBoardAdministratorRequestTransformer.transform(
    approvedRequest,
  );
}
