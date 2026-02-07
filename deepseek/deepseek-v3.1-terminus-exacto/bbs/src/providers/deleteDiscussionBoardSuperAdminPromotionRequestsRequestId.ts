import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
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
import { DiscussionBoardAdministratorPromotionRequestTransformer } from "../transformers/DiscussionBoardAdministratorPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminPromotionRequestsRequestId(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorPromotionRequest> {
  // Find the promotion request
  const promotionRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUnique(
      {
        where: { id: props.requestId },
        ...DiscussionBoardAdministratorPromotionRequestTransformer.select(),
      },
    );
  if (!promotionRequest) {
    throw new HttpException("Promotion request not found", 404);
  }
  // Only allow deletion of pending requests
  if (promotionRequest.status !== "pending") {
    throw new HttpException(
      "Cannot delete approved or rejected promotion request",
      400,
    );
  }
  // Delete the promotion request and return the deleted record
  await MyGlobal.prisma.discussion_board_administrator_promotion_requests.delete(
    {
      where: { id: props.requestId },
    },
  );
  return await DiscussionBoardAdministratorPromotionRequestTransformer.transform(
    promotionRequest,
  );
}
