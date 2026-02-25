import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceReviewModerationActionTransformer } from "../transformers/EcommerceReviewModerationActionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorReviewModerationActionsActionId(props: {
  administrator: AdministratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceReviewModerationAction> {
  // Verify that the requesting administrator has access to moderation actions
  const requestingAdmin =
    await MyGlobal.prisma.ecommerce_administrators.findUnique({
      where: { id: props.administrator.id, deleted_at: null },
    });
  if (!requestingAdmin) {
    throw new HttpException("Administrator not found or unauthorized", 403);
  }
  const moderationAction =
    await MyGlobal.prisma.ecommerce_review_moderation_actions.findUniqueOrThrow(
      {
        where: { id: props.actionId },
        ...EcommerceReviewModerationActionTransformer.select(),
      },
    );
  return await EcommerceReviewModerationActionTransformer.transform(
    moderationAction,
  );
}
