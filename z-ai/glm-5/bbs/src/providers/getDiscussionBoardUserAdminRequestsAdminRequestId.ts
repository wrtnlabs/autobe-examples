import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardAdminRequestTransformer } from "../transformers/DiscussionBoardAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserAdminRequestsAdminRequestId(props: {
  user: UserPayload;
  adminRequestId: string;
}): Promise<IDiscussionBoardAdminRequest> {
  // Fetch the admin request with requester and reviewer relations
  const request =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.adminRequestId },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  // Authorization check: user must be requester OR super administrator
  const isRequester = request.requester.id === props.user.id;
  let isSuperAdmin = false;
  if (!isRequester) {
    const userRecord = await MyGlobal.prisma.discussion_board_users.findUnique({
      where: { id: props.user.id },
      select: { permission_level: true },
    });
    isSuperAdmin = userRecord?.permission_level === "SUPER_ADMINISTRATOR";
  }
  if (!isRequester && !isSuperAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  return await DiscussionBoardAdminRequestTransformer.transform(request);
}
