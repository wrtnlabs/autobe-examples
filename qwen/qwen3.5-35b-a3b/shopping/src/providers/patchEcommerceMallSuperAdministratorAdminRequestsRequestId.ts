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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallAdministratorApprovalRequestsTransformer } from "../transformers/EcommerceMallAdministratorApprovalRequestsTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorAdminRequestsRequestId(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdministratorApprovalRequests.IUpdate;
}): Promise<IEcommerceMallAdministratorApprovalRequests> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findFirstOrThrow(
      {
        ...EcommerceMallAdministratorApprovalRequestsTransformer.select(),
        where: {
          id: props.requestId,
          deleted_at: null,
          status: "pending",
        },
      },
    );
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Invalid status", 400);
  }
  let createdAdminId: string | null = null;
  if (props.body.status === "approved") {
    const requesterId =
      record.requestingMember?.id ?? record.requestingSeller?.id;
    if (!requesterId) {
      throw new HttpException("Requester not found", 404);
    }
    const email =
      record.requestingMember?.email ?? record.requestingSeller?.email;
    const displayName =
      record.requestingMember?.display_name ??
      record.requestingSeller?.display_name;
    if (!email || !displayName) {
      throw new HttpException("Requester email or display name missing", 400);
    }
    const adminId = v4();
    const passwordHash = await PasswordUtil.hash("");
    const createdAdmin =
      await MyGlobal.prisma.ecommerce_mall_administrators.create({
        data: {
          id: adminId,
          email,
          display_name: displayName,
          grade: "regular",
          is_banned: false,
          created_at: toISOStringSafe(new Date()) as string,
          updated_at: toISOStringSafe(new Date()) as string,
          deleted_at: null,
          password_hash: passwordHash,
        },
      });
    createdAdminId = adminId;
  }
  const updatedRecord =
    await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.update(
      {
        where: {
          id: props.requestId,
          deleted_at: null,
        },
        data: {
          status: props.body.status,
          reviewing_super_admin_id: props.superAdministrator.id,
          updated_at: toISOStringSafe(new Date()) as string,
          created_admin_id: createdAdminId,
        },
        ...EcommerceMallAdministratorApprovalRequestsTransformer.select(),
      },
    );
  return await EcommerceMallAdministratorApprovalRequestsTransformer.transform(
    updatedRecord,
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
// export async function patchEcommerceMallSuperAdministratorAdminRequestsRequestId(props: {
//   superAdministrator: SuperadministratorPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallAdministratorApprovalRequests.IUpdate;
// }): Promise<IEcommerceMallAdministratorApprovalRequests> {
//   const record = await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findFirstOrThrow({
//     ...EcommerceMallAdministratorApprovalRequestsTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdministratorApprovalRequestsTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------