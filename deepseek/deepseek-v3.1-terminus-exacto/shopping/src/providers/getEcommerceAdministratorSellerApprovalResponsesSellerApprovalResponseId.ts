import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceSellerApprovalResponseTransformer } from "../transformers/EcommerceSellerApprovalResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorSellerApprovalResponsesSellerApprovalResponseId(props: {
  administrator: AdministratorPayload;
  sellerApprovalResponseId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSellerApprovalResponse> {
  const response =
    await MyGlobal.prisma.ecommerce_seller_approval_responses.findUniqueOrThrow(
      {
        where: { id: props.sellerApprovalResponseId },
        ...EcommerceSellerApprovalResponseTransformer.select(),
      },
    );
  return await EcommerceSellerApprovalResponseTransformer.transform(response);
}
