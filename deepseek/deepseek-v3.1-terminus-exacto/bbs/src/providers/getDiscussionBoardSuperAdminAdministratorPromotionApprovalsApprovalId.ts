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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardAdministratorPromotionApprovalTransformer } from "../transformers/DiscussionBoardAdministratorPromotionApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminAdministratorPromotionApprovalsApprovalId(props: {
  superAdmin: SuperAdminPayload;
  approvalId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorPromotionApproval> {
  const approval =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.approvalId },
        ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
      },
    );
  return await DiscussionBoardAdministratorPromotionApprovalTransformer.transform(
    approval,
  );
}
