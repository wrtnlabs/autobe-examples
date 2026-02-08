import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdministratorRequestCollector } from "../collectors/ShoppingMallAdministratorRequestCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorAdministratorRequests(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorRequest.ICreate;
}): Promise<IShoppingMallAdministratorRequest> {
  // Collect data using the collector
  const collectedData = await ShoppingMallAdministratorRequestCollector.collect(
    { body: props.body },
  );
  const validActorTypes = ["customer", "seller"] as const;
  if (!validActorTypes.includes(collectedData.actor_type)) {
    throw new HttpException(
      "Invalid actor_type: must be 'customer' or 'seller'",
      400,
    );
  }
  // Create the record in DB
  const created =
    await MyGlobal.prisma.shopping_mall_administrator_requests.create({
      data: collectedData,
    });
  // Return response converting dates with toISOStringSafe
  return {
    id: created.id,
    actor_type: created.actor_type,
    reason: created.reason,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
