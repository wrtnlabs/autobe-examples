import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAdministratorAtSummaryTransformer } from "../transformers/ShoppingMallAdministratorAtSummaryTransformer";
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerPasswordResetsResetId(props: {
  customer: CustomerPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerPasswordReset> {
  const customerReset =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findUnique({
      where: { id: props.resetId },
      select: {
        id: true,
        token: true,
        created_at: true,
        expired_at: true,
        deleted_at: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
      },
    });
  if (customerReset) {
    return {
      id: customerReset.id,
      token: customerReset.token,
      created_at: customerReset.created_at.toISOString(),
      expired_at: customerReset.expired_at.toISOString(),
      deleted_at: customerReset.deleted_at?.toISOString() ?? null,
      user_type: "customer",
      user: await ShoppingMallCustomerAtSummaryTransformer.transform(
        customerReset.customer,
      ),
    };
  }
  const sellerReset =
    await MyGlobal.prisma.shopping_mall_seller_password_resets.findUnique({
      where: { id: props.resetId },
      select: {
        id: true,
        token: true,
        created_at: true,
        expires_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
      },
    });
  if (sellerReset) {
    return {
      id: sellerReset.id,
      token: sellerReset.token,
      created_at: sellerReset.created_at.toISOString(),
      expired_at: sellerReset.expires_at.toISOString(),
      deleted_at: null,
      user_type: "seller",
      user: await ShoppingMallSellerAtSummaryTransformer.transform(
        sellerReset.seller,
      ),
    };
  }
  const adminReset =
    await MyGlobal.prisma.shopping_mall_administrator_password_resets.findUnique(
      {
        where: { id: props.resetId },
        select: {
          id: true,
          token: true,
          created_at: true,
          expired_at: true,
          deleted_at: true,
          administrator: ShoppingMallAdministratorAtSummaryTransformer.select(),
        },
      },
    );
  if (adminReset) {
    return {
      id: adminReset.id,
      token: adminReset.token,
      created_at: adminReset.created_at.toISOString(),
      expired_at: adminReset.expired_at.toISOString(),
      deleted_at: adminReset.deleted_at?.toISOString() ?? null,
      user_type: "administrator",
      user: await ShoppingMallAdministratorAtSummaryTransformer.transform(
        adminReset.administrator,
      ),
    };
  }
  throw new HttpException("Password reset not found", 404);
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
// import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallCustomerPasswordResetsResetId(props: {
//   customer: CustomerPayload;
//   resetId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallCustomerPasswordReset> {
//   return {
//     id: ...,
//     token: ...,
//     created_at: ...,
//     expired_at: ...,
//     deleted_at: ...,
//     user_type: ...,
//     user: await ShoppingMallCustomerAtSummaryTransformer.transform(...),
//   };
// }
// ```
//--------------------------------------------------------------