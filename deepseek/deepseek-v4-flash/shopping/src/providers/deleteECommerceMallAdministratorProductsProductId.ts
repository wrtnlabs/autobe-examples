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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteECommerceMallAdministratorProductsProductId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the product exists.
  // Prisma throws NotFoundError on miss, which the framework maps to HTTP 404.
  await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  // Step 2: Soft-delete the product.
  // Per Section 23, administrators can delete ANY product for policy
  // violations with NO seller-specific prerequisites (ownership check,
  // pending orders, cancellations, refunds are all skipped).
  //
  // Using UPDATE (not Prisma .delete()):
  //   - sets visibility to 'deleted' — hides from all listings
  //   - records deleted_at for retention/recovery
  //   - updates updated_at to reflect the change
  //   - onDelete Cascade NEVER fires → product_snapshots, snapshot_variants,
  //     and snapshot_images remain preserved in the database
  await MyGlobal.prisma.e_commerce_mall_products.update({
    where: { id: props.productId },
    data: {
      visibility: "deleted",
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
// export async function deleteECommerceMallAdministratorProductsProductId(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------