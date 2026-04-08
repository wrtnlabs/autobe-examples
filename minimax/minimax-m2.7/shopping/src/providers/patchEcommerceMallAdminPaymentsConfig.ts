import { IEcommerceMallPaymentConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPaymentConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// In-memory payment configuration store
interface IPaymentConfigStore {
  gatewayName: string;
  mode: "test" | "production";
  apiEndpoint: string & tags.Format<"uri">;
  apiKey?: string;
  apiSecret?: string;
  merchantId?: string;
  webhookUrl?: string & tags.Format<"uri">;
  timeoutSeconds: number;
  additionalSettings: Record<string, string>;
  isActive: boolean;
  updatedAt: string & tags.Format<"date-time">;
}
// Module-level singleton for configuration persistence
const paymentConfigStore: {
  config: IPaymentConfigStore | null;
} = {
  config: null,
};
function getCurrentTimestamp(): string & tags.Format<"date-time"> {
  const now = new globalThis.Date();
  return toISOStringSafe(now);
}
function getDefaultConfig(): IPaymentConfigStore {
  const now = getCurrentTimestamp();
  return {
    gatewayName: "stripe",
    mode: "test",
    apiEndpoint: "https://api.stripe.com/v1" as string & tags.Format<"uri">,
    merchantId: undefined,
    webhookUrl: undefined,
    timeoutSeconds: 30,
    additionalSettings: {},
    isActive: false,
    updatedAt: now,
  };
}
function getCurrentConfig(): IPaymentConfigStore {
  if (paymentConfigStore.config === null) {
    paymentConfigStore.config = getDefaultConfig();
  }
  return paymentConfigStore.config;
}
function generateUuid(): string & tags.Format<"uuid"> {
  const result = v4();
  return result as string & tags.Format<"uuid">;
}
export async function patchEcommerceMallAdminPaymentsConfig(props: {
  admin: AdminPayload;
  body: IEcommerceMallPaymentConfig.IUpdate;
}): Promise<IEcommerceMallPaymentConfig.IConfig> {
  const current = getCurrentConfig();
  const now = getCurrentTimestamp();
  // Merge existing config with updates from body
  const updated: IPaymentConfigStore = {
    gatewayName:
      props.body.gatewayName !== undefined
        ? props.body.gatewayName
        : current.gatewayName,
    mode: props.body.mode !== undefined ? props.body.mode : current.mode,
    apiEndpoint:
      props.body.apiEndpoint !== undefined
        ? props.body.apiEndpoint
        : current.apiEndpoint,
    apiKey:
      props.body.apiKey !== undefined ? props.body.apiKey : current.apiKey,
    apiSecret:
      props.body.apiSecret !== undefined
        ? props.body.apiSecret
        : current.apiSecret,
    merchantId:
      props.body.merchantId !== undefined
        ? props.body.merchantId
        : current.merchantId,
    webhookUrl:
      props.body.webhookUrl !== undefined
        ? props.body.webhookUrl
        : current.webhookUrl,
    timeoutSeconds:
      props.body.timeoutSeconds !== undefined
        ? props.body.timeoutSeconds
        : current.timeoutSeconds,
    additionalSettings:
      props.body.additionalSettings !== undefined
        ? props.body.additionalSettings
        : current.additionalSettings,
    isActive: current.isActive,
    updatedAt: now,
  };
  // Persist updated configuration
  paymentConfigStore.config = updated;
  // Log the configuration change in admin_audit_logs
  const updatedFields = Object.keys(props.body).filter((key) => {
    const value = props.body[key as keyof IEcommerceMallPaymentConfig.IUpdate];
    return value !== undefined;
  });
  const auditLogId: string & tags.Format<"uuid"> = generateUuid();
  const adminId: string & tags.Format<"uuid"> = props.admin.id;
  await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.create({
    data: {
      id: auditLogId,
      ecommerce_mall_admin_id: adminId,
      action: "update_payment_config",
      resource_type: "payment_gateway",
      resource_id: adminId,
      details: JSON.stringify({
        updated_fields: updatedFields,
        timestamp: now,
      }),
      ip_address: "",
      user_agent: null,
      created_at: new globalThis.Date(now),
    },
  });
  // Build and return the updated configuration response
  // Note: apiKey and apiSecret are NOT returned (write-only fields for security)
  const response: IEcommerceMallPaymentConfig.IConfig = {
    gatewayName: updated.gatewayName,
    mode: updated.mode,
    apiEndpoint: updated.apiEndpoint,
    merchantId: updated.merchantId,
    webhookUrl: updated.webhookUrl,
    additionalSettings:
      Object.keys(updated.additionalSettings).length > 0
        ? updated.additionalSettings
        : undefined,
    isActive: updated.isActive,
    updatedAt: updated.updatedAt,
    timeoutSeconds: updated.timeoutSeconds,
  };
  return response;
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
// import { IEcommerceMallPaymentConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPaymentConfig";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminPaymentsConfig(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallPaymentConfig.IUpdate;
// }): Promise<IEcommerceMallPaymentConfig.IConfig> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------