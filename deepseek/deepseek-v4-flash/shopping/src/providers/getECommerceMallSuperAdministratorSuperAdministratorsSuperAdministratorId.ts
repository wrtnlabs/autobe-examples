import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallSuperAdministratorTransformer } from "../transformers/ECommerceMallSuperAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getECommerceMallSuperAdministratorSuperAdministratorsSuperAdministratorId(props: {
  superAdministrator: SuperadministratorPayload;
  superAdministratorId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallSuperAdministrator> {
  const record =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.findFirstOrThrow(
      {
        where: {
          id: props.superAdministratorId,
          deleted_at: null,
        },
        ...ECommerceMallSuperAdministratorTransformer.select(),
      },
    );
  return await ECommerceMallSuperAdministratorTransformer.transform(record);
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
// import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallSuperAdministratorSuperAdministratorsSuperAdministratorId(props: {
//   superAdministrator: SuperadministratorPayload;
//   superAdministratorId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallSuperAdministrator> {
//   const record = await MyGlobal.prisma.e_commerce_mall_super_administrators.findFirstOrThrow({
//     ...ECommerceMallSuperAdministratorTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallSuperAdministratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------