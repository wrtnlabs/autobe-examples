import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallAdministratorApprovalRequestsCollector } from "../collectors/EcommerceMallAdministratorApprovalRequestsCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallAdministratorApprovalRequestsTransformer } from "../transformers/EcommerceMallAdministratorApprovalRequestsTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallMemberAdministratorApprovalRequests(props: {
  member: MemberPayload;
  body: IEcommerceMallAdministratorApprovalRequests.ICreate;
}): Promise<IEcommerceMallAdministratorApprovalRequests> {
  const { requestingMemberId, requestingSellerId, reason } = props.body;
  if (requestingMemberId !== undefined && requestingSellerId !== undefined) {
    throw new HttpException(
      "Either requestingMemberId or requestingSellerId must be provided, not both",
      400,
    );
  }
  if (requestingMemberId === undefined && requestingSellerId === undefined) {
    throw new HttpException(
      "Either requestingMemberId or requestingSellerId must be provided",
      400,
    );
  }
  if (reason === undefined || reason === null || reason.trim() === "") {
    throw new HttpException("Reason is required and cannot be empty", 400);
  }
  let requestedMemberId: (string & tags.Format<"uuid">) | null = null;
  let requestedSellerId: (string & tags.Format<"uuid">) | null = null;
  if (requestingMemberId !== undefined) {
    const memberExists = await MyGlobal.prisma.ecommerce_mall_members.findFirst(
      {
        where: {
          id: requestingMemberId,
          deleted_at: null,
        },
        select: { id: true },
      },
    );
    if (memberExists === null) {
      throw new HttpException("Referenced member does not exist", 404);
    }
    requestedMemberId = requestingMemberId;
    const existingRequest =
      await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findFirst(
        {
          where: {
            requesting_member_id: requestedMemberId,
            status: "pending",
            deleted_at: null,
          },
          select: { id: true },
        },
      );
    if (existingRequest !== null) {
      throw new HttpException(
        "User already has a pending approval request",
        409,
      );
    }
  }
  if (requestingSellerId !== undefined) {
    const sellerExists = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst(
      {
        where: {
          id: requestingSellerId,
          deleted_at: null,
        },
        select: { id: true },
      },
    );
    if (sellerExists === null) {
      throw new HttpException("Referenced seller does not exist", 404);
    }
    requestedSellerId = requestingSellerId;
    const existingRequest =
      await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findFirst(
        {
          where: {
            requesting_seller_id: requestedSellerId,
            status: "pending",
            deleted_at: null,
          },
          select: { id: true },
        },
      );
    if (existingRequest !== null) {
      throw new HttpException(
        "User already has a pending approval request",
        409,
      );
    }
  }
  const record =
    await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.create(
      {
        data: await EcommerceMallAdministratorApprovalRequestsCollector.collect(
          {
            body: props.body,
          },
        ),
        ...EcommerceMallAdministratorApprovalRequestsTransformer.select(),
      },
    );
  return await EcommerceMallAdministratorApprovalRequestsTransformer.transform(
    record,
  );
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
// import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallMemberAdministratorApprovalRequests(props: {
//   member: MemberPayload;
//   body: IEcommerceMallAdministratorApprovalRequests.ICreate;
// }): Promise<IEcommerceMallAdministratorApprovalRequests> {
//   const record = await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.create({
//     data: await EcommerceMallAdministratorApprovalRequestsCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallAdministratorApprovalRequestsTransformer.select(),
//   });
//   return await EcommerceMallAdministratorApprovalRequestsTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------