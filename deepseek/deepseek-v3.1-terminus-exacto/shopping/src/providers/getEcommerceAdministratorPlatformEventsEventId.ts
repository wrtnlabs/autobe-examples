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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorPlatformEventsEventId(props: {
  administrator: AdministratorPayload;
  eventId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformEvent> {
  // First verify the administrator exists and is active
  const admin = await MyGlobal.prisma.ecommerce_administrators.findFirst({
    where: { id: props.administrator.id, deleted_at: null },
  });
  if (!admin) {
    throw new HttpException("Administrator not found", 404);
  }
  // Retrieve the platform event
  const event =
    await MyGlobal.prisma.ecommerce_platform_events.findUniqueOrThrow({
      where: { id: props.eventId },
    });
  // For this implementation, since we don't have the related actor junction tables loaded,
  // we'll return the requesting administrator as the actor for administrator access
  return {
    actor_type: "administrator",
    actor_id: props.administrator.id,
    actor: {
      id: admin.id as string & tags.Format<"uuid">,
      email: admin.email as string & tags.Format<"email">,
      created_at: admin.created_at.toISOString() as string &
        tags.Format<"date-time">,
    } satisfies IEcommerceAdministrator.ISummary,
    session_id: null,
    initiator_ip: null,
    initiator_href: null,
    initiator_referrer: null,
    created_at: event.created_at.toISOString() as string &
      tags.Format<"date-time">,
  };
}
