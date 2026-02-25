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
import { EcommerceAdministratorAtSummaryTransformer } from "../transformers/EcommerceAdministratorAtSummaryTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "../transformers/EcommerceCustomerAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "../transformers/EcommerceSellerAtSummaryTransformer";
import { EcommerceSuperAdministratorAtSummaryTransformer } from "../transformers/EcommerceSuperAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSuperAdministratorPlatformEventsEventId(props: {
  superAdministrator: SuperadministratorPayload;
  eventId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformEvent> {
  // Query the platform event with all possible initiator relationships
  const event =
    await MyGlobal.prisma.ecommerce_platform_events.findUniqueOrThrow({
      where: { id: props.eventId },
      include: {
        administratorEvent: {
          include: {
            administrator: EcommerceAdministratorAtSummaryTransformer.select(),
            administratorSession: { select: { id: true } },
          },
        },
        customerInitiators: {
          include: {
            customer: EcommerceCustomerAtSummaryTransformer.select(),
          },
        },
        sellerInitiators: {
          include: {
            seller: EcommerceSellerAtSummaryTransformer.select(),
            sellerSession: { select: { id: true } },
          },
        },
        superAdministratorInitiators: {
          include: {
            superAdministrator:
              EcommerceSuperAdministratorAtSummaryTransformer.select(),
          },
        },
      },
    });
  // Resolve actor information based on which initiator relationship exists
  let actor_type:
    | "administrator"
    | "customer"
    | "seller"
    | "superAdministrator";
  let actor:
    | IEcommerceAdministrator.ISummary
    | IEcommerceCustomer.ISummary
    | IEcommerceSeller.ISummary
    | IEcommerceSuperAdministrator.ISummary;
  let actor_id: string & tags.Format<"uuid">;
  let session_id: (string & tags.Format<"uuid">) | null | undefined = null;
  let initiator_ip: (string & tags.Format<"ipv4">) | null | undefined = null;
  let initiator_href: (string & tags.Format<"uri">) | null | undefined = null;
  let initiator_referrer: (string & tags.Format<"uri">) | null | undefined =
    null;
  if (event.administratorEvent) {
    actor_type = "administrator";
    actor = await EcommerceAdministratorAtSummaryTransformer.transform(
      event.administratorEvent.administrator,
    );
    actor_id = event.administratorEvent.administrator_id;
    session_id = event.administratorEvent.administratorSession?.id ?? null;
  } else if (event.customerInitiators.length > 0) {
    actor_type = "customer";
    actor = await EcommerceCustomerAtSummaryTransformer.transform(
      event.customerInitiators[0].customer,
    );
    actor_id = event.customerInitiators[0].ecommerce_customer_id;
  } else if (event.sellerInitiators.length > 0) {
    actor_type = "seller";
    actor = await EcommerceSellerAtSummaryTransformer.transform(
      event.sellerInitiators[0].seller,
    );
    actor_id = event.sellerInitiators[0].ecommerce_seller_id;
    session_id = event.sellerInitiators[0].sellerSession?.id ?? null;
    initiator_ip =
      (event.sellerInitiators[0].initiator_ip as string &
        tags.Format<"ipv4">) ?? null;
    initiator_href =
      (event.sellerInitiators[0].initiator_href as string &
        tags.Format<"uri">) ?? null;
    initiator_referrer =
      (event.sellerInitiators[0].initiator_referrer as string &
        tags.Format<"uri">) ?? null;
  } else if (event.superAdministratorInitiators.length > 0) {
    actor_type = "superAdministrator";
    actor = await EcommerceSuperAdministratorAtSummaryTransformer.transform(
      event.superAdministratorInitiators[0].superAdministrator,
    );
    actor_id =
      event.superAdministratorInitiators[0].ecommerce_super_administrator_id;
  } else {
    throw new HttpException("Platform event has no valid initiator", 500);
  }
  return {
    actor_type,
    actor_id,
    actor,
    session_id,
    initiator_ip,
    initiator_href,
    initiator_referrer,
    created_at: event.created_at.toISOString(),
  };
}
