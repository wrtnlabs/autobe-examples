import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceAdministratorAtSummaryTransformer } from "../transformers/EcommerceAdministratorAtSummaryTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "../transformers/EcommerceCustomerAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "../transformers/EcommerceSellerAtSummaryTransformer";
import { EcommerceSuperAdministratorAtSummaryTransformer } from "../transformers/EcommerceSuperAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorPlatformEventsEventIdSubtypesSubtypeId(props: {
  administrator: AdministratorPayload;
  eventId: string & tags.Format<"uuid">;
  subtypeId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformEvent> {
  // First validate that the platform event exists
  await MyGlobal.prisma.ecommerce_platform_events.findUniqueOrThrow({
    where: { id: props.eventId },
  });
  // Try to find the subtype relationship in each subtype table sequentially
  // Start with administrators
  const adminSubtype =
    await MyGlobal.prisma.ecommerce_platform_event_of_administrators.findUnique(
      {
        where: { id: props.subtypeId, platform_event_id: props.eventId },
        include: {
          administrator: EcommerceAdministratorAtSummaryTransformer.select(),
          platformEvent: true,
          administratorSession: true,
        },
      },
    );
  if (adminSubtype) {
    const actor = await EcommerceAdministratorAtSummaryTransformer.transform(
      adminSubtype.administrator,
    );
    return {
      actor_type: "administrator",
      actor_id: adminSubtype.administrator_id,
      actor,
      session_id: adminSubtype.administrator_session_id ?? null,
      initiator_ip: null,
      initiator_href: null,
      initiator_referrer: null,
      created_at: adminSubtype.created_at.toISOString(),
    };
  }
  // Try customers
  const customerSubtype =
    await MyGlobal.prisma.ecommerce_platform_event_of_customers.findUnique({
      where: {
        id: props.subtypeId,
        ecommerce_platform_event_id: props.eventId,
      },
      include: {
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        platformEvent: true,
      },
    });
  if (customerSubtype) {
    const actor = await EcommerceCustomerAtSummaryTransformer.transform(
      customerSubtype.customer,
    );
    return {
      actor_type: "customer",
      actor_id: customerSubtype.ecommerce_customer_id,
      actor,
      session_id: null,
      initiator_ip: null,
      initiator_href: null,
      initiator_referrer: null,
      created_at: customerSubtype.created_at.toISOString(),
    };
  }
  // Try sellers
  const sellerSubtype =
    await MyGlobal.prisma.ecommerce_platform_event_of_sellers.findUnique({
      where: {
        id: props.subtypeId,
        ecommerce_platform_event_id: props.eventId,
      },
      include: {
        seller: EcommerceSellerAtSummaryTransformer.select(),
        platformEvent: true,
        sellerSession: true,
      },
    });
  if (sellerSubtype) {
    const actor = await EcommerceSellerAtSummaryTransformer.transform(
      sellerSubtype.seller,
    );
    return {
      actor_type: "seller",
      actor_id: sellerSubtype.ecommerce_seller_id,
      actor,
      session_id: sellerSubtype.ecommerce_seller_session_id ?? null,
      initiator_ip:
        (sellerSubtype.initiator_ip as
          | (string & tags.Format<"ipv4">)
          | null
          | undefined) ?? null,
      initiator_href:
        (sellerSubtype.initiator_href as
          | (string & tags.Format<"uri">)
          | null
          | undefined) ?? null,
      initiator_referrer:
        (sellerSubtype.initiator_referrer as
          | (string & tags.Format<"uri">)
          | null
          | undefined) ?? null,
      created_at: sellerSubtype.created_at.toISOString(),
    };
  }
  // Try super administrators
  const superAdminSubtype =
    await MyGlobal.prisma.ecommerce_platform_event_of_super_administrators.findUnique(
      {
        where: {
          id: props.subtypeId,
          ecommerce_platform_event_id: props.eventId,
        },
        include: {
          superAdministrator:
            EcommerceSuperAdministratorAtSummaryTransformer.select(),
          platformEvent: true,
        },
      },
    );
  if (superAdminSubtype) {
    const actor =
      await EcommerceSuperAdministratorAtSummaryTransformer.transform(
        superAdminSubtype.superAdministrator,
      );
    return {
      actor_type: "superAdministrator",
      actor_id: superAdminSubtype.ecommerce_super_administrator_id,
      actor,
      session_id: null,
      initiator_ip: null,
      initiator_href: null,
      initiator_referrer: null,
      created_at: superAdminSubtype.created_at.toISOString(),
    };
  }
  throw new HttpException("Subtype relationship not found", 404);
}
