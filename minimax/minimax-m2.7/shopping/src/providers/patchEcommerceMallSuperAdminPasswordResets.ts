import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminPasswordResets(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallCustomerPasswordReset.IRequest;
}): Promise<IEcommerceMallCustomerPasswordReset.IResponse> {
  const email = props.body.email;
  if (email) {
    const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
      where: {
        email: email,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
      },
    });
    if (customer) {
      const rawToken = v4();
      const hashedToken = await PasswordUtil.hash(rawToken);
      const expiresAtDate = new Date();
      expiresAtDate.setHours(expiresAtDate.getHours() + 1);
      const expiresAt: Date = expiresAtDate;
      await MyGlobal.prisma.ecommerce_mall_customer_password_resets.updateMany({
        where: {
          ecommerce_mall_customer_id: customer.id,
          used_at: null,
        },
        data: {
          used_at: new Date(),
        },
      });
      const newResetId: string & tags.Format<"uuid"> = v4();
      await MyGlobal.prisma.ecommerce_mall_customer_password_resets.create({
        data: {
          id: newResetId,
          ecommerce_mall_customer_id: customer.id,
          token: hashedToken,
          expires_at: expiresAt,
          used_at: null,
        },
      });
      const emailDomain = email.split("@")[1] ?? "unknown";
      const requestedAt = new Date().toISOString() as string &
        tags.Format<"date-time">;
      try {
        const auditLogId: string & tags.Format<"uuid"> = v4();
        await MyGlobal.prisma.ecommerce_mall_super_admin_audit_logs.create({
          data: {
            id: auditLogId,
            ecommerce_mall_super_admin_id: props.superAdmin.id,
            action: "PASSWORD_RESET_REQUEST",
            target_type: "customer",
            target_id: customer.id,
            ip: "0.0.0.0",
            user_agent: "system",
            metadataEntries: {
              create: [
                {
                  id: v4(),
                  key: "email_domain",
                  value: emailDomain,
                  created_at: new Date(),
                },
                {
                  id: v4(),
                  key: "requested_at",
                  value: requestedAt,
                  created_at: new Date(),
                },
              ],
            },
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      } catch {
        // Audit logging failure should not fail the entire operation
      }
    }
  }
  return {
    message:
      "If an account with that email exists, a password reset link has been sent.",
  };
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
// import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminPasswordResets(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallCustomerPasswordReset.IRequest;
// }): Promise<IEcommerceMallCustomerPasswordReset.IResponse> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------