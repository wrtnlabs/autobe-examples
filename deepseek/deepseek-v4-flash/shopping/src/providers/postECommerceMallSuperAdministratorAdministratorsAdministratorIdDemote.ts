import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallAdministratorTransformer } from "../transformers/ECommerceMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallSuperAdministratorAdministratorsAdministratorIdDemote(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallAdministrator> {
  // Step 1: Validate target administrator exists — creates 404 if not found
  await MyGlobal.prisma.e_commerce_mall_administrators.findUniqueOrThrow({
    where: { id: props.administratorId },
    select: { id: true },
  });
  // Step 2: Check target is currently a super administrator — 422 if already regular
  const targetSuperAdmin =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.findUnique({
      where: { e_commerce_mall_administrator_id: props.administratorId },
    });
  if (targetSuperAdmin === null) {
    throw new HttpException(
      "The target administrator is already a regular administrator",
      422,
    );
  }
  // Step 3: Enforce no-self-demotion rule
  const authSuperAdmin =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.findUniqueOrThrow(
      {
        where: { id: props.superAdministrator.id },
        select: { e_commerce_mall_administrator_id: true },
      },
    );
  if (
    authSuperAdmin.e_commerce_mall_administrator_id === props.administratorId
  ) {
    throw new HttpException(
      "Self-demotion is prohibited. Request demotion from another super administrator.",
      403,
    );
  }
  // Step 4: Execute transaction — audit log + soft-delete + return demoted admin
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    // 4a: Create immutable grade change log entry
    await tx.e_commerce_mall_admin_grade_change_logs.create({
      data: {
        id: v4(),
        administrator_id: props.administratorId,
        super_administrator_id: props.superAdministrator.id,
        previous_grade: "super",
        new_grade: "regular",
        created_at: now,
      },
    });
    // 4b: Soft-delete the super administrator record
    // Idempotent: works even if already soft-deleted (per spec)
    await tx.e_commerce_mall_super_administrators.update({
      where: { id: targetSuperAdmin.id },
      data: { deleted_at: now },
    });
    // 4c: Retrieve the demoted administrator with transformer select
    return await tx.e_commerce_mall_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
      ...ECommerceMallAdministratorTransformer.select(),
    });
  });
  // Step 5: Transform to API response DTO
  return await ECommerceMallAdministratorTransformer.transform(record);
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
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallSuperAdministratorAdministratorsAdministratorIdDemote(props: {
//   superAdministrator: SuperadministratorPayload;
//   administratorId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallAdministrator> {
//   const record = await MyGlobal.prisma.e_commerce_mall_administrators.findFirstOrThrow({
//     ...ECommerceMallAdministratorTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallAdministratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------