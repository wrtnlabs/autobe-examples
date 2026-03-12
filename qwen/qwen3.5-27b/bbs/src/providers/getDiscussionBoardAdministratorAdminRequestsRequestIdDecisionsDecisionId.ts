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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardAdminRequestDecisionTransformer } from "../transformers/DiscussionBoardAdminRequestDecisionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorAdminRequestsRequestIdDecisionsDecisionId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
  decisionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminRequestDecision> {
  const decision =
    await MyGlobal.prisma.discussion_board_admin_request_decisions.findUniqueOrThrow(
      {
        where: {
          id: props.decisionId,
          deleted_at: null,
        },
        ...DiscussionBoardAdminRequestDecisionTransformer.select(),
      },
    );
  return await DiscussionBoardAdminRequestDecisionTransformer.transform(
    decision,
  );
}
