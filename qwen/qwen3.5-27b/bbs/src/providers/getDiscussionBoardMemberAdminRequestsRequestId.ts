import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAdminRequestTransformer } from "../transformers/DiscussionBoardAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberAdminRequestsRequestId(props: {
  member: MemberPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminRequest> {
  const request =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: {
        id: props.requestId,
        deleted_at: null,
        discussion_board_member_id: props.member.id,
      },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  return await DiscussionBoardAdminRequestTransformer.transform(request);
}
