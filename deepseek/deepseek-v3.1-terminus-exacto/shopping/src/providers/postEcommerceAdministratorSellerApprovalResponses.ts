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
import { EcommerceSellerApprovalResponseCollector } from "../collectors/EcommerceSellerApprovalResponseCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceSellerApprovalResponseTransformer } from "../transformers/EcommerceSellerApprovalResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorSellerApprovalResponses(props: {
  administrator: AdministratorPayload;
  body: IEcommerceSellerApprovalResponse.ICreate;
}): Promise<IEcommerceSellerApprovalResponse> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    // Validate seller approval queue exists and is in "pending" or "under_review" status
    const approvalQueue =
      await prisma.ecommerce_seller_approval_queues.findUniqueOrThrow({
        where: { id: props.body.seller_approval_queue_id },
        select: {
          id: true,
          status: true,
          seller: { select: { id: true } },
          administrator: { select: { id: true } },
          ecommerce_seller_id: true,
        },
      });
    if (
      approvalQueue.status !== "pending" &&
      approvalQueue.status !== "under_review"
    ) {
      throw new HttpException(
        "Seller approval queue is not in a reviewable status",
        400,
      );
    }
    // Ensure the queue is assigned to the current administrator or assign it
    const administratorId = approvalQueue.administrator?.id;
    if (!administratorId) {
      await prisma.ecommerce_seller_approval_queues.update({
        where: { id: props.body.seller_approval_queue_id },
        data: {
          administrator: { connect: { id: props.administrator.id } },
          review_start_date: new Date(),
        },
      });
    } else if (administratorId !== props.administrator.id) {
      throw new HttpException(
        "Seller approval queue is assigned to another administrator",
        403,
      );
    }
    // Use collector to create response
    const responseData = await EcommerceSellerApprovalResponseCollector.collect(
      {
        body: props.body,
        ecommerceAdministrators: { id: props.administrator.id },
      },
    );
    // Create approval response
    const response = await prisma.ecommerce_seller_approval_responses.create({
      data: responseData,
      ...EcommerceSellerApprovalResponseTransformer.select(),
    });
    // Update seller approval queue with final decision
    const updateData: any = {
      status: props.body.decision === "approved" ? "approved" : "rejected",
      updated_at: new Date(),
    };
    if (props.body.decision === "approved") {
      updateData.approval_date = new Date();
    } else {
      updateData.rejection_date = new Date();
      updateData.rejection_reason = props.body.reason;
    }
    await prisma.ecommerce_seller_approval_queues.update({
      where: { id: props.body.seller_approval_queue_id },
      data: updateData,
    });
    // Update seller account status if approved
    if (props.body.decision === "approved") {
      await prisma.ecommerce_sellers.update({
        where: { id: approvalQueue.ecommerce_seller_id },
        data: {
          account_status: "active",
          updated_at: new Date(),
        },
      });
    }
    // Transform and return the response
    return await EcommerceSellerApprovalResponseTransformer.transform(response);
  });
}
