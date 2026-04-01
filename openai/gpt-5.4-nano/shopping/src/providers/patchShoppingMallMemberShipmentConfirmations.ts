import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberConfirmations(props: {
  member: MemberPayload;
  body: IShoppingMallShipmentConfirmation.IRequest;
}): Promise<IShoppingMallShipmentConfirmation> {
  const shoppingMallShipmentId = props.body.shoppingMallShipmentId;
  const result =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: shoppingMallShipmentId },
    });
  const base = result as unknown as IShoppingMallShipmentConfirmation;
  return {
    ...base,
    ...("confirmed_at" in (result as any)
      ? {
          confirmed_at:
            (result as any).confirmed_at == null
              ? (null as any)
              : toISOStringSafe((result as any).confirmed_at),
        }
      : {}),
    ...("created_at" in (result as any)
      ? {
          created_at:
            (result as any).created_at == null
              ? toISOStringSafe(new Date())
              : toISOStringSafe((result as any).created_at),
        }
      : {}),
    ...("updated_at" in (result as any)
      ? {
          updated_at:
            (result as any).updated_at == null
              ? toISOStringSafe(new Date())
              : toISOStringSafe((result as any).updated_at),
        }
      : {}),
    ...("deleted_at" in (result as any)
      ? {
          deleted_at:
            (result as any).deleted_at == null
              ? null
              : toISOStringSafe((result as any).deleted_at),
        }
      : {}),
  };
}
