import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppGuestTransformer } from "../transformers/TodoAppGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppGuests(props: {
  body: ITodoAppGuest.ICreate;
}): Promise<ITodoAppGuest> {
  const now = new Date().toISOString();
  const expiredAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const guestId = v4();
  await MyGlobal.prisma.todo_app_guests.create({
    data: {
      id: guestId,
      created_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: v4(),
      todo_app_guest_id: guestId,
      ip: "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: expiredAt,
    },
  });
  const record = await MyGlobal.prisma.todo_app_guests.findUniqueOrThrow({
    where: { id: guestId },
    ...TodoAppGuestTransformer.select(),
  });
  return await TodoAppGuestTransformer.transform(record);
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
// import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postTodoAppGuests(props: {
//   body: ITodoAppGuest.ICreate;
// }): Promise<ITodoAppGuest> {
//   const record = await MyGlobal.prisma.todo_app_guests.findFirstOrThrow({
//     ...TodoAppGuestTransformer.select(),
//     where: { ... },
//   });
//   return await TodoAppGuestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------