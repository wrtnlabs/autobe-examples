import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommercePlatformEventOfSellerTransformer } from "../transformers/EcommercePlatformEventOfSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

/**
 * Retrieve detailed information about a specific seller approval queue record.
 *
 * This operation provides comprehensive access to seller registration approval workflow data,
 * including the seller's registration information, assigned administrator for review, current
 * approval status, submission timeline, and any rejection details if applicable.
 *
 * @param props - Object containing administrator authentication payload and seller approval queue ID
 * @returns Complete seller approval queue information with workflow metadata
 * @throws {HttpException} If the approval queue record is not found or unauthorized access
 */
export async function getEcommerceAdministratorSellerApprovalQueuesSellerApprovalQueueId(props: {
  administrator: AdministratorPayload;
  sellerApprovalQueueId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformEventOfSeller> {
  // Verify the administrator has seller management privileges
  // Authentication is already handled by the decorator, but we validate the record exists
  const approvalQueue =
    await MyGlobal.prisma.ecommerce_seller_approval_queues.findUniqueOrThrow({
      where: {
        id: props.sellerApprovalQueueId,
      },
      ...EcommercePlatformEventOfSellerTransformer.select(),
    });
  return await EcommercePlatformEventOfSellerTransformer.transform(
    approvalQueue,
  );
}
