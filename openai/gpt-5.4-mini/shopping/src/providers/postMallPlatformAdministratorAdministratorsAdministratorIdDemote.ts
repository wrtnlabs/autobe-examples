import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformAdministratorTransformer } from "../transformers/MallPlatformAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAdministratorAdministratorsAdministratorIdDemote(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformAdministrator> {
  const currentAdministrator =
    await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: {
        id: true,
        grade: true,
      },
    });
  if (currentAdministrator.grade !== "super administrator") {
    throw new HttpException("Forbidden", 403);
  }
  if (props.administrator.id === props.administratorId) {
    throw new HttpException("Forbidden", 403);
  }
  const updatedAdministrator = await MyGlobal.prisma.$transaction(
    async (prisma) => {
      await prisma.mall_platform_administrators.findUniqueOrThrow({
        where: { id: props.administratorId },
        select: {
          id: true,
        },
      });
      return await prisma.mall_platform_administrators.update({
        where: { id: props.administratorId },
        data: {
          grade: "regular administrator",
        },
        ...MallPlatformAdministratorTransformer.select(),
      });
    },
  );
  return await MallPlatformAdministratorTransformer.transform(
    updatedAdministrator,
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
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAdministratorAdministratorsAdministratorIdDemote(props: {
//   administrator: AdministratorPayload;
//   administratorId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformAdministrator> {
//   const record = await MyGlobal.prisma.mall_platform_administrators.findFirstOrThrow({
//     ...MallPlatformAdministratorTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformAdministratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------