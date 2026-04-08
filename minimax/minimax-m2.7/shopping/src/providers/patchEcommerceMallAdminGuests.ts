import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallGuestTransformer } from "../transformers/EcommerceMallGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminGuests(props: {
  admin: AdminPayload;
  body: IEcommerceMallGuest.IUpsert;
}): Promise<IEcommerceMallGuest> {
  const now = new Date();
  const existing = await MyGlobal.prisma.ecommerce_mall_guests.findFirst({
    ...EcommerceMallGuestTransformer.select(),
    where: {
      fingerprint: props.body.fingerprint,
      deleted_at: null,
    },
  });
  if (existing) {
    await MyGlobal.prisma.ecommerce_mall_guests.update({
      where: { id: existing.id },
      data: {
        ip_address:
          props.body.ipAddress !== undefined
            ? props.body.ipAddress
            : existing.ip_address,
        user_agent:
          props.body.userAgent !== undefined
            ? props.body.userAgent
            : existing.user_agent,
        last_active_at: now,
        updated_at: now,
      },
    });
    const record =
      await MyGlobal.prisma.ecommerce_mall_guests.findUniqueOrThrow({
        where: { id: existing.id },
        ...EcommerceMallGuestTransformer.select(),
      });
    return await EcommerceMallGuestTransformer.transform(record);
  }
  const created = await MyGlobal.prisma.ecommerce_mall_guests.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      fingerprint: props.body.fingerprint,
      ip_address: props.body.ipAddress ?? null,
      user_agent: props.body.userAgent ?? null,
      last_active_at: now,
      created_at: now,
      updated_at: now,
    },
  });
  return await EcommerceMallGuestTransformer.transform(
    created as unknown as Prisma.ecommerce_mall_guestsGetPayload<
      ReturnType<typeof EcommerceMallGuestTransformer.select>
    >,
  );
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
// import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminGuests(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallGuest.IUpsert;
// }): Promise<IEcommerceMallGuest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_guests.findFirstOrThrow({
//     ...EcommerceMallGuestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallGuestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------