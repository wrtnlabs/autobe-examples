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

export async function postMallPlatformAdministratorAdministratorsAdministratorIdPromote(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const caller =
    await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
      where: {
        id: props.administrator.id,
      },
      select: {
        id: true,
        grade: true,
      },
    });
  if (caller.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  const target =
    await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
      where: {
        id: props.administratorId,
      },
      select: {
        id: true,
        grade: true,
      },
    });
  if (target.grade === "super") {
    throw new HttpException("Conflict", 409);
  }
  await MyGlobal.prisma.mall_platform_administrators.update({
    where: {
      id: props.administratorId,
    },
    data: {
      grade: "super",
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAdministratorAdministratorsAdministratorIdPromote(props: {
//   administrator: AdministratorPayload;
//   administratorId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------