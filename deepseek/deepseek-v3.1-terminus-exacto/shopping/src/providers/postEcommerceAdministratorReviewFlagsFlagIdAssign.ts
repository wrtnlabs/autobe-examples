import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceReviewFlagTransformer } from "../transformers/EcommerceReviewFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorReviewFlagsFlagIdAssign(props: {
  administrator: AdministratorPayload;
  flagId: string & tags.Format<"uuid">;
  body: IEcommerceReviewFlag.IAssign;
}): Promise<IEcommerceReviewFlag> {
  const flag = await MyGlobal.prisma.ecommerce_review_flags.findUniqueOrThrow({
    where: {
      id: props.flagId,
      deleted_at: null,
    },
  });
  if (flag.status !== "pending") {
    throw new HttpException("Flag must be in pending status to assign", 400);
  }
  if (flag.ecommerce_administrator_id !== null) {
    throw new HttpException(
      "Flag is already assigned to another administrator",
      400,
    );
  }
  const now = new Date();
  const updatedFlag = await MyGlobal.prisma.ecommerce_review_flags.update({
    where: { id: props.flagId },
    data: {
      ecommerce_administrator_id: props.administrator.id,
      status: "under_review",
      assigned_at: now,
      updated_at: now,
    },
    ...EcommerceReviewFlagTransformer.select(),
  });
  return await EcommerceReviewFlagTransformer.transform(updatedFlag);
}
