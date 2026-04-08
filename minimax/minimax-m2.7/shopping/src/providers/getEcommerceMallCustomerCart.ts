import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartAtInvertTransformer } from "../transformers/EcommerceMallCartAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCart(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallCart.IInvert> {
  const cart = await MyGlobal.prisma.ecommerce_mall_carts.findFirst({
    where: { ecommerce_mall_customer_id: props.customer.id },
    ...EcommerceMallCartAtInvertTransformer.select(),
  });
  if (cart !== null) {
    return await EcommerceMallCartAtInvertTransformer.transform(cart);
  }
  const customerData =
    await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
      where: { id: props.customer.id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: {
          select: {
            id: true,
            display_name: true,
            phone: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  const now = new Date().toISOString();
  return {
    id: props.customer.id,
    cartTotal: 0,
    createdAt: now,
    updatedAt: now,
    customer: {
      id: customerData!.id,
      email: customerData!.email,
      createdAt: customerData!.created_at.toISOString(),
      updatedAt: customerData!.updated_at.toISOString(),
      deletedAt: customerData!.deleted_at?.toISOString() ?? null,
      customerProfile: {
        id: customerData!.profile!.id,
        displayName: customerData!.profile!.display_name,
        phone: customerData!.profile!.phone,
        createdAt: customerData!.profile!.created_at.toISOString(),
        updatedAt: customerData!.profile!.updated_at.toISOString(),
        profileType: "customer",
      },
    },
    items: [],
  };
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
// import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerCart(props: {
//   customer: CustomerPayload;
// }): Promise<IEcommerceMallCart.IInvert> {
//   const record = await MyGlobal.prisma.ecommerce_mall_carts.findFirstOrThrow({
//     ...EcommerceMallCartAtInvertTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCartAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------