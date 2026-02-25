import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";
import { EcommerceSuperAdministratorAtSummaryTransformer } from "./EcommerceSuperAdministratorAtSummaryTransformer";

export namespace EcommerceAuditLogTransformer {
  export type Payload = Prisma.ecommerce_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        event_subtype: true,
        severity: true,
        ip_address: true,
        user_agent: true,
        resource_type: true,
        resource_id: true,
        action_description: true,
        context_data: true,
        success: true,
        error_message: true,
        created_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        seller: EcommerceSellerAtSummaryTransformer.select(),
        administrator: EcommerceAdministratorAtSummaryTransformer.select(),
        superAdministrator:
          EcommerceSuperAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_audit_logsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceAuditLog> {
    return {
      id: input.id,
      customer: input.customer
        ? await EcommerceCustomerAtSummaryTransformer.transform(input.customer)
        : undefined,
      seller: input.seller
        ? await EcommerceSellerAtSummaryTransformer.transform(input.seller)
        : undefined,
      administrator: input.administrator
        ? await EcommerceAdministratorAtSummaryTransformer.transform(
            input.administrator,
          )
        : undefined,
      superAdministrator: input.superAdministrator
        ? await EcommerceSuperAdministratorAtSummaryTransformer.transform(
            input.superAdministrator,
          )
        : undefined,
      event_type: input.event_type,
      event_subtype: input.event_subtype,
      severity: input.severity,
      ip_address: input.ip_address ?? undefined,
      user_agent: input.user_agent ?? undefined,
      resource_type: input.resource_type ?? undefined,
      resource_id: input.resource_id ?? undefined,
      action_description: input.action_description,
      context_data: input.context_data ?? undefined,
      success: input.success,
      error_message: input.error_message ?? undefined,
      created_at: input.created_at.toISOString(),
    };
  }
}
