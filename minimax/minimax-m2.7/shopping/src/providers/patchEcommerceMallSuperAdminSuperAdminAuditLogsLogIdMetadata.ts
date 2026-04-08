import { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLogMetadatum";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer } from "../transformers/EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSuperAdminAuditLogsLogIdMetadata(props: {
  superAdmin: SuperadminPayload;
  logId: string & tags.Format<"uuid">;
  body: IEcommerceMallSuperAdminAuditLogMetadatum.IRequest;
}): Promise<IPageIEcommerceMallSuperAdminAuditLogMetadatum.ISummary> {
  // 1. Verify the parent audit log exists
  await MyGlobal.prisma.ecommerce_mall_super_admin_audit_logs.findUniqueOrThrow(
    {
      where: { id: props.logId },
      select: { id: true },
    },
  );
  // 2. Upsert each metadata entry from request body
  const entries = Object.entries(props.body);
  for (const [key, value] of entries) {
    const existing =
      await MyGlobal.prisma.ecommerce_mall_super_admin_audit_log_metadata.findUnique(
        {
          where: {
            ecommerce_mall_super_admin_audit_log_id_key: {
              ecommerce_mall_super_admin_audit_log_id: props.logId,
              key: key,
            },
          },
        },
      );
    if (existing) {
      await MyGlobal.prisma.ecommerce_mall_super_admin_audit_log_metadata.update(
        {
          where: { id: existing.id },
          data: { value: value },
        },
      );
    } else {
      await MyGlobal.prisma.ecommerce_mall_super_admin_audit_log_metadata.create(
        {
          data: {
            id: v4(),
            ecommerce_mall_super_admin_audit_log_id: props.logId,
            key: key,
            value: value,
            created_at: new Date(),
          },
        },
      );
    }
  }
  // 3. Update parent audit log timestamp
  await MyGlobal.prisma.ecommerce_mall_super_admin_audit_logs.update({
    where: { id: props.logId },
    data: { updated_at: new Date() },
  });
  // 4. Return paginated metadata entries
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.ecommerce_mall_super_admin_audit_log_metadata.findMany(
      {
        where: { ecommerce_mall_super_admin_audit_log_id: props.logId },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_mall_super_admin_audit_log_metadata.count({
      where: { ecommerce_mall_super_admin_audit_log_id: props.logId },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallSuperAdminAuditLogMetadatum.ISummary;
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
// import { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
// import { IPageIEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLogMetadatum";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminSuperAdminAuditLogsLogIdMetadata(props: {
//   superAdmin: SuperadminPayload;
//   logId: string & tags.Format<"uuid">;
//   body: IEcommerceMallSuperAdminAuditLogMetadatum.IRequest;
// }): Promise<IPageIEcommerceMallSuperAdminAuditLogMetadatum.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_super_admin_audit_log_metadata.findMany({
//     ...EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSuperAdminAuditLogMetadatumAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------