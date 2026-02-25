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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSuperAdministratorPlatformEventsEventIdSubtypesSubtypeId(props: {
  superAdministrator: SuperadministratorPayload;
  eventId: string & tags.Format<"uuid">;
  subtypeId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformEvent> {
  // Verify platform event exists
  await MyGlobal.prisma.ecommerce_platform_events.findUniqueOrThrow({
    where: { id: props.eventId },
  });
  // Query subtype relationships sequentially to find the matching one
  let foundSubtype: any = null;
  let actorType:
    | "administrator"
    | "customer"
    | "seller"
    | "superAdministrator"
    | null = null;
  // Try administrator subtype first
  const adminSubtype =
    await MyGlobal.prisma.ecommerce_platform_event_of_administrators.findUnique(
      {
        where: { id: props.subtypeId, platform_event_id: props.eventId },
        include: { administrator: true, administratorSession: true },
      },
    );
  if (adminSubtype) {
    foundSubtype = adminSubtype;
    actorType = "administrator";
  } else {
    // Try customer subtype
    const customerSubtype =
      await MyGlobal.prisma.ecommerce_platform_event_of_customers.findUnique({
        where: {
          id: props.subtypeId,
          ecommerce_platform_event_id: props.eventId,
        },
        include: { customer: true },
      });
    if (customerSubtype) {
      foundSubtype = customerSubtype;
      actorType = "customer";
    } else {
      // Try seller subtype
      const sellerSubtype =
        await MyGlobal.prisma.ecommerce_platform_event_of_sellers.findUnique({
          where: {
            id: props.subtypeId,
            ecommerce_platform_event_id: props.eventId,
          },
          include: { seller: true, sellerSession: true },
        });
      if (sellerSubtype) {
        foundSubtype = sellerSubtype;
        actorType = "seller";
      } else {
        // Try super administrator subtype
        const superAdminSubtype =
          await MyGlobal.prisma.ecommerce_platform_event_of_super_administrators.findUnique(
            {
              where: {
                id: props.subtypeId,
                ecommerce_platform_event_id: props.eventId,
              },
              include: { superAdministrator: true },
            },
          );
        if (superAdminSubtype) {
          foundSubtype = superAdminSubtype;
          actorType = "superAdministrator";
        }
      }
    }
  }
  if (!foundSubtype || !actorType) {
    throw new HttpException("Subtype relationship not found", 404);
  }
  // Extract actor details based on type
  let actor:
    | IEcommerceAdministrator.ISummary
    | IEcommerceCustomer.ISummary
    | IEcommerceSeller.ISummary
    | IEcommerceSuperAdministrator.ISummary;
  let actorId: string & tags.Format<"uuid">;
  let sessionId: (string & tags.Format<"uuid">) | null | undefined;
  switch (actorType) {
    case "administrator":
      actor = {
        id: foundSubtype.administrator.id,
        email: foundSubtype.administrator.email,
        created_at: foundSubtype.administrator.created_at.toISOString(),
      } satisfies IEcommerceAdministrator.ISummary;
      actorId = foundSubtype.administrator_id;
      sessionId = foundSubtype.administrator_session_id ?? undefined;
      break;
    case "customer":
      actor = {
        id: foundSubtype.customer.id,
        email: foundSubtype.customer.email,
        display_name: foundSubtype.customer.display_name,
        created_at: foundSubtype.customer.created_at.toISOString(),
      } satisfies IEcommerceCustomer.ISummary;
      actorId = foundSubtype.ecommerce_customer_id;
      sessionId = undefined;
      break;
    case "seller":
      actor = {
        id: foundSubtype.seller.id,
        email: foundSubtype.seller.email,
        shop_name: foundSubtype.seller.shop_name,
        shop_description: foundSubtype.seller.shop_description,
        logo_image_url: foundSubtype.seller.logo_image_url,
        account_status: foundSubtype.seller.account_status,
        created_at: foundSubtype.seller.created_at.toISOString(),
      } satisfies IEcommerceSeller.ISummary;
      actorId = foundSubtype.ecommerce_seller_id;
      sessionId = foundSubtype.ecommerce_seller_session_id ?? undefined;
      break;
    case "superAdministrator":
      actor = {
        id: foundSubtype.superAdministrator.id,
        email: foundSubtype.superAdministrator.email,
        created_at: foundSubtype.superAdministrator.created_at.toISOString(),
      } satisfies IEcommerceSuperAdministrator.ISummary;
      actorId = foundSubtype.ecommerce_super_administrator_id;
      sessionId = undefined;
      break;
  }
  // Extract event-specific fields that may vary by subtype
  const initiatorIp =
    "initiator_ip" in foundSubtype
      ? (foundSubtype.initiator_ip ?? undefined)
      : undefined;
  const initiatorHref =
    "initiator_href" in foundSubtype
      ? (foundSubtype.initiator_href ?? undefined)
      : undefined;
  const initiatorReferrer =
    "initiator_referrer" in foundSubtype
      ? (foundSubtype.initiator_referrer ?? undefined)
      : undefined;
  return {
    actor_type: actorType,
    actor_id: actorId,
    actor,
    session_id: sessionId,
    initiator_ip: initiatorIp,
    initiator_href: initiatorHref,
    initiator_referrer: initiatorReferrer,
    created_at: foundSubtype.created_at.toISOString(),
  };
}
