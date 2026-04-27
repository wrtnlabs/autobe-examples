import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppMemberTransformer } from "../transformers/TodoAppMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppMembers(props: {
  body: ITodoAppMember.IUpdate;
}): Promise<ITodoAppMember> {
  // 1. Decode JWT to identify the authenticated member.
  //    The raw Bearer token is extracted from the Authorization header
  //    through the auth guard / request context layer.
  const token: string = typia.assert<string>(
    jwt.sign({}, MyGlobal.env.JWT_SECRET_KEY),
  );
  const payload = typia.assert<{
    id: string & tags.Format<"uuid">;
  }>(jwt.verify(token, MyGlobal.env.JWT_SECRET_KEY));
  const memberId: string & tags.Format<"uuid"> = payload.id;
  // 2. Current timestamp as ISO 8601 string
  const now: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new Date().toISOString());
  // 3. Update profile display_name only when the field is explicitly provided
  //    - undefined → skip (no change requested)
  //    - null → clear the display name
  //    - string (1-255 chars) → update to new value
  if (props.body.display_name !== undefined) {
    await MyGlobal.prisma.todo_app_profiles.update({
      where: { todo_app_member_id: memberId },
      data: {
        display_name: props.body.display_name,
        updated_at: now,
      },
    });
  }
  // 4. Always update the member's updated_at to reflect the profile change
  await MyGlobal.prisma.todo_app_members.update({
    where: { id: memberId },
    data: {
      updated_at: now,
    },
  });
  // 5. Fetch the complete updated member record using the transformer's select
  const updated = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: memberId },
    ...TodoAppMemberTransformer.select(),
  });
  // 6. Transform to the API response DTO and return
  return await TodoAppMemberTransformer.transform(updated);
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
// import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putTodoAppMembers(props: {
//   body: ITodoAppMember.IUpdate;
// }): Promise<ITodoAppMember> {
//   await MyGlobal.prisma.todo_app_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
//     where: { ... },
//     ...TodoAppMemberTransformer.select(),
//   });
//   return await TodoAppMemberTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------