import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallSellerApprovalRequestTransformer } from "../transformers/EcommerceMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorSellerApprovalRequestsRequestId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerApprovalRequest.IUpdate;
}): Promise<IEcommerceMallSellerApprovalRequest> {
  // 1. Find and validate the request exists and is pending
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findFirstOrThrow(
      {
        ...EcommerceMallSellerApprovalRequestTransformer.select(),
        where: {
          id: props.requestId,
          deleted_at: null,
          status: "pending",
        },
      },
    );
  // 2. Validate body constraints
  if (props.body.status === "approved") {
    if (props.body.rejection_reason !== undefined) {
      throw new HttpException(
        "Rejection reason must not be provided when approving",
        400,
      );
    }
  } else if (props.body.status === "rejected") {
    if (
      props.body.rejection_reason === undefined ||
      props.body.rejection_reason.trim().length === 0
    ) {
      throw new HttpException(
        "Rejection reason is required when rejecting",
        400,
      );
    }
  }
  // 3. Create snapshot before update for audit trail
  const snapshotId = v4() satisfies string & tags.Format<"uuid">;
  await MyGlobal.prisma.ecommerce_mall_seller_approval_requests_snapshots.create(
    {
      data: {
        id: snapshotId,
        seller: { connect: { id: record.seller.id } },
        reviewer: record.reviewer?.id
          ? { connect: { id: record.reviewer.id } }
          : undefined,
        status: record.status,
        request_reason: record.request_reason,
        rejection_reason: record.rejection_reason,
        created_at: toISOStringSafe(record.created_at),
        updated_at: toISOStringSafe(record.updated_at),
        deleted_at:
          record.deleted_at !== null
            ? toISOStringSafe(record.deleted_at)
            : null,
        sellerApprovalRequest: { connect: { id: props.requestId } },
      },
    },
  );
  // 4. Update the approval request
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.status ?? record.status,
        reviewer: { connect: { id: props.administrator.id } },
        rejection_reason: props.body.rejection_reason ?? null,
        updated_at: toISOStringSafe(new Date()),
      },
      ...EcommerceMallSellerApprovalRequestTransformer.select(),
    });
  return await EcommerceMallSellerApprovalRequestTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorSellerApprovalRequestsRequestId(props: {
//   administrator: AdministratorPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallSellerApprovalRequest.IUpdate;
// }): Promise<IEcommerceMallSellerApprovalRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findFirstOrThrow({
//     ...EcommerceMallSellerApprovalRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerApprovalRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------