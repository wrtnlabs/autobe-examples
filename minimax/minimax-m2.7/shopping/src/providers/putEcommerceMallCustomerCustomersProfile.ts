import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerCustomersProfile(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerProfile.IUpdate;
}): Promise<IEcommerceMallCustomerProfile> {
  // Validate at least one field is provided
  if (props.body.displayName === undefined && props.body.phone === undefined) {
    throw new HttpException(
      "At least one field (displayName or phone) must be provided",
      400,
    );
  }
  // Fetch customer account to verify it exists and is not deleted
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (customer === null) {
    throw new HttpException("Customer account not found", 404);
  }
  // Fetch existing profile
  const existingProfile =
    await MyGlobal.prisma.ecommerce_mall_customer_profiles.findUniqueOrThrow({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
      },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        display_name: true,
        phone: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Build partial update data with only provided fields
  const updateData: {
    display_name?: string;
    phone?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.displayName !== undefined) {
    updateData.display_name = props.body.displayName;
  }
  if (props.body.phone !== undefined) {
    updateData.phone = props.body.phone;
  }
  // Update database record
  const updatedProfile =
    await MyGlobal.prisma.ecommerce_mall_customer_profiles.update({
      where: {
        id: existingProfile.id,
      },
      data: updateData,
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        display_name: true,
        phone: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Return complete updated profile
  return {
    id: updatedProfile.id as string & tags.Format<"uuid">,
    profileType: "customer",
    customerId: updatedProfile.ecommerce_mall_customer_id as string &
      tags.Format<"uuid">,
    displayName: updatedProfile.display_name,
    phone: updatedProfile.phone,
    createdAt: toISOStringSafe(updatedProfile.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(updatedProfile.updated_at) as string &
      tags.Format<"date-time">,
  } satisfies IEcommerceMallCustomerProfile;
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
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallCustomerCustomersProfile(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCustomerProfile.IUpdate;
// }): Promise<IEcommerceMallCustomerProfile> {
//   await MyGlobal.prisma.....update({
//     where: { ... },
//     data: { ... },
//   });
// }
// ```
//--------------------------------------------------------------